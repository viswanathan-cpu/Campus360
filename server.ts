import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import {
  campusStore,
  verifyJwt,
  hashPassword,
  JwtPayload,
} from './src/backend/phase5bStore.ts';
import { analyzeComplaintOnce } from './src/backend/aiEngine.ts';
import {
  PermissionModule,
  ROLE_RBAC_MATRIX,
  UserRole,
  CampusComplaint,
} from './src/types/campus.ts';

interface AuthenticatedRequest extends Request {
  auth?: JwtPayload;
}

// Live System Configuration state for System Administrator inside the Digital Twin
const systemConfigState = {
  zeroTrustStrictMode: true,
  refreshTokenRotationEnabled: true,
  autoAiTriageOnComplaint: true,
  telemetryTickIntervalSec: 5,
  mfaEnforcementPolicy: 'ADAPTIVE_RBAC',
  updatedAt: new Date().toISOString(),
  updatedBy: 'viktor.kane@campus360.edu',
};

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  app.use(express.json());

  // Socket.IO JWT Authentication & Room Binding
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      socket.data.authenticated = false;
      return next();
    }
    const payload = verifyJwt(token, 'access');
    if (!payload) {
      return next(new Error('INVALID_ACCESS_TOKEN'));
    }
    const session = campusStore.redisSessions.get(payload.sessionId);
    if (!session || session.revoked) {
      return next(new Error('SESSION_REVOKED'));
    }
    socket.data.authenticated = true;
    socket.data.user = payload;
    next();
  });

  io.on('connection', (socket) => {
    if (socket.data.authenticated && socket.data.user) {
      const user = socket.data.user as JwtPayload;
      socket.join(`role:${user.role}`);
      socket.join(`session:${user.sessionId}`);
      socket.emit('session:connected', {
        sessionId: user.sessionId,
        role: user.role,
        serverTime: new Date().toISOString(),
      });
    }
  });

  function recordAndEmitAudit(entry: Parameters<typeof campusStore.logAudit>[0]) {
    const record = campusStore.logAudit(entry);
    io.to(`role:${UserRole.SYSTEM_ADMIN}`).emit('audit:logged', record);
    return record;
  }

  function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing Bearer access token' });
      return;
    }
    const token = authHeader.slice(7);
    const payload = verifyJwt(token, 'access');
    if (!payload) {
      res.status(401).json({ error: 'Access token expired or invalid' });
      return;
    }
    const session = campusStore.redisSessions.get(payload.sessionId);
    if (!session || session.revoked) {
      res.status(401).json({ error: 'Session revoked in Redis cluster' });
      return;
    }
    req.auth = payload;
    next();
  }

  function requirePermission(anyOfPermissions: PermissionModule[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }
      const hasPerm = anyOfPermissions.some((p) => req.auth!.permissions.includes(p));
      if (!hasPerm) {
        recordAndEmitAudit({
          userId: req.auth.sub,
          userEmail: req.auth.email,
          userRole: req.auth.role,
          action: 'RBAC_ACCESS_DENIED',
          module: anyOfPermissions.join('|'),
          ipAddress: req.ip || '10.24.0.12',
          status: 'DENIED',
          metadata: `Attempted unauthorized access to ${req.originalUrl}`,
        });
        res.status(403).json({
          error: `RBAC Policy Violation: Role ${req.auth.role} lacks permission [${anyOfPermissions.join(', ')}]`,
        });
        return;
      }
      next();
    };
  }

  // ============================================================================
  // ENTERPRISE AUTHENTICATION & 7 PORTALS API (/api/auth/*)
  // ============================================================================

  app.get('/api/auth/demo-accounts', (_req: Request, res: Response) => {
    res.json({
      accounts: campusStore.getDemoCredentials(),
      liveCampusSummary: {
        buildingsOnline: campusStore.buildings.length,
        totalRooms: campusStore.rooms3D.length,
        healthyRooms: campusStore.rooms3D.filter((r) => r.operationalState === 'WORKING').length,
        activeIssues: campusStore.rooms3D.filter((r) => r.operationalState === 'NOT_WORKING').length,
        totalPowerKw: Number(
          campusStore.buildings.reduce((acc, b) => acc + b.powerKw, 0).toFixed(1)
        ),
        totalSolarKw: Number(
          campusStore.buildings.reduce((acc, b) => acc + b.solarOutputKw, 0).toFixed(1)
        ),
        totalOccupancy: campusStore.buildings.reduce((acc, b) => acc + b.occupancy, 0),
      },
    });
  });

  app.get('/api/auth/preview-inbox', (_req: Request, res: Response) => {
    res.json({ messages: campusStore.previewInbox });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password, role } = req.body as {
      email?: string;
      password?: string;
      role?: UserRole;
    };
    const ipAddress = req.ip || '10.24.1.44';
    const userAgent = req.headers['user-agent'] || 'Campus360 Spatial Client';

    let user = role
      ? campusStore.users.find((u) => u.role === role)
      : undefined;

    if (!user && email) {
      user = campusStore.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (user && password && user.passwordHash !== hashPassword(password) && user.demoPasswordPlain !== password) {
        res.status(401).json({
          error: 'Invalid email or password. Use the pre-filled demo credentials or 1-Click Demo Login.',
        });
        return;
      }
    }

    if (!user) {
      res.status(401).json({
        error: 'Account not found. Choose one of the 7 role portals or click 1-Click Demo Login.',
      });
      return;
    }

    user.emailVerified = true;
    const sessionBundle = campusStore.createSession(user, ipAddress, userAgent);
    const roleMeta = ROLE_RBAC_MATRIX[user.role];

    recordAndEmitAudit({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'AUTH_PORTAL_LOGIN_SUCCESS',
      module: `digital_twin:${user.role.toLowerCase()}`,
      ipAddress,
      status: 'SUCCESS',
      metadata: `Signed in to ${roleMeta.displayName} Dashboard -> Shared 3D Digital Twin`,
    });

    res.json({
      user: campusStore.toPublicUser(user),
      roleMetadata: roleMeta,
      accessToken: sessionBundle.accessToken,
      refreshToken: sessionBundle.refreshToken,
      expiresIn: sessionBundle.expiresIn,
      session: campusStore.getPublicSession(sessionBundle.sessionId),
    });
  });

  app.post('/api/auth/refresh', (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    const ipAddress = req.ip || '10.24.1.44';
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const result = campusStore.rotateRefreshToken(refreshToken, ipAddress);
    if ('error' in result) {
      io.to(`role:${UserRole.SYSTEM_ADMIN}`).emit('session:updated', campusStore.getAllSessions());
      res.status(401).json({ error: result.error });
      return;
    }

    io.to(`role:${UserRole.SYSTEM_ADMIN}`).emit('session:updated', campusStore.getAllSessions());

    res.json({
      user: result.user,
      roleMetadata: ROLE_RBAC_MATRIX[result.user.role],
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      session: result.session,
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const { refreshToken, sessionId } = req.body as {
      refreshToken?: string;
      sessionId?: string;
    };
    const ipAddress = req.ip || '10.24.1.44';

    let targetSessionId = sessionId;
    if (!targetSessionId && refreshToken) {
      const decoded = verifyJwt(refreshToken, 'refresh');
      targetSessionId = decoded?.sessionId;
    }

    if (targetSessionId) {
      const session = campusStore.redisSessions.get(targetSessionId);
      if (session) {
        session.revoked = true;
        recordAndEmitAudit({
          userId: session.userId,
          userEmail: session.userEmail,
          userRole: session.userRole,
          action: 'AUTH_LOGOUT_SESSION_REVOKED',
          module: 'auth:logout',
          ipAddress,
          status: 'SUCCESS',
          metadata: `Session ${session.id} terminated and refresh token family invalidated`,
        });
      }
    }

    io.to(`role:${UserRole.SYSTEM_ADMIN}`).emit('session:updated', campusStore.getAllSessions());
    res.json({ success: true });
  });

  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    const ipAddress = req.ip || '10.24.1.44';
    if (!email) {
      res.status(400).json({ error: 'Please enter your enterprise email address' });
      return;
    }

    const user = campusStore.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!user) {
      res.status(404).json({ error: 'No Campus360 account found for that email address' });
      return;
    }

    const resetToken = `RST-${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 30 * 60 * 1000;

    const emailMsg = {
      id: `eml-${Date.now()}`,
      to: user.email,
      recipientName: user.fullName,
      subject: 'Campus360 Security — Password Reset Token',
      type: 'RESET_PASSWORD' as const,
      token: resetToken,
      actionLabel: 'Reset Account Password',
      bodyPreview: `Requested password recovery for ${user.fullName} (${ROLE_RBAC_MATRIX[user.role].displayName}). Click below to load reset token ${resetToken} (valid for 30 minutes).`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    campusStore.previewInbox.unshift(emailMsg);

    recordAndEmitAudit({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'PASSWORD_RESET_TOKEN_ISSUED',
      module: 'auth:recovery',
      ipAddress,
      status: 'SUCCESS',
      metadata: `Reset token dispatched to Preview Inbox for ${user.email}`,
    });

    res.json({
      message: 'Password reset link dispatched to the Preview Inbox.',
      previewEmail: emailMsg,
    });
  });

  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    const ipAddress = req.ip || '10.24.1.44';

    if (!token || !newPassword || newPassword.length < 6) {
      res.status(400).json({
        error: 'Valid reset token and a password of at least 6 characters are required',
      });
      return;
    }

    const user = campusStore.users.find((u) => u.resetToken === token.trim());
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
      res.status(400).json({ error: 'Invalid or expired password reset token' });
      return;
    }

    user.passwordHash = hashPassword(newPassword);
    user.demoPasswordPlain = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    for (const sess of campusStore.redisSessions.values()) {
      if (sess.userId === user.id) {
        sess.revoked = true;
      }
    }

    recordAndEmitAudit({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      module: 'auth:recovery',
      ipAddress,
      status: 'SUCCESS',
      metadata: `Password updated and all prior sessions revoked for ${user.email}`,
    });

    res.json({
      success: true,
      email: user.email,
      message: 'Password updated. You may now sign in with your new password.',
    });
  });

  app.post('/api/auth/request-verification', (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    const ipAddress = req.ip || '10.24.1.44';
    if (!email) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }

    const user = campusStore.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!user) {
      res.status(404).json({ error: 'No Campus360 account found for that email address' });
      return;
    }

    const verifyToken = `VRF-${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
    user.verificationToken = verifyToken;

    const emailMsg = {
      id: `eml-${Date.now()}`,
      to: user.email,
      recipientName: user.fullName,
      subject: 'Campus360 Identity — Verify Your Enterprise Email',
      type: 'VERIFY_EMAIL' as const,
      token: verifyToken,
      actionLabel: 'Verify Email Token',
      bodyPreview: `Confirm identity ownership for ${user.fullName} (${ROLE_RBAC_MATRIX[user.role].displayName}) using cryptographic verification token ${verifyToken}.`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    campusStore.previewInbox.unshift(emailMsg);

    recordAndEmitAudit({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'EMAIL_VERIFICATION_DISPATCHED',
      module: 'auth:verify',
      ipAddress,
      status: 'SUCCESS',
      metadata: `Verification token issued to Preview Inbox for ${user.email}`,
    });

    res.json({
      message: 'Verification email delivered to Preview Inbox.',
      previewEmail: emailMsg,
    });
  });

  app.post('/api/auth/verify-email', (req: Request, res: Response) => {
    const { token } = req.body as { token?: string };
    const ipAddress = req.ip || '10.24.1.44';
    if (!token) {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }

    const user = campusStore.users.find((u) => u.verificationToken === token.trim());
    if (!user) {
      res.status(400).json({ error: 'Invalid email verification token' });
      return;
    }

    user.emailVerified = true;
    user.verificationToken = undefined;

    recordAndEmitAudit({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'EMAIL_VERIFIED_SUCCESS',
      module: 'auth:verify',
      ipAddress,
      status: 'SUCCESS',
      metadata: `Account email verified for ${user.email}`,
    });

    res.json({
      success: true,
      email: user.email,
      message: `Email verified for ${user.fullName} (${user.email}).`,
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = campusStore.users.find((u) => u.id === req.auth!.sub);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      user: campusStore.toPublicUser(user),
      roleMetadata: ROLE_RBAC_MATRIX[user.role],
      session: campusStore.getPublicSession(req.auth!.sessionId),
    });
  });

  // ============================================================================
  // 3D DIGITAL TWIN & SPATIAL ROOM APIs (/api/campus/*)
  // ============================================================================

  app.get('/api/campus/bootstrap', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const role = req.auth!.role;
    const perms = req.auth!.permissions;

    res.json({
      role,
      roleMetadata: ROLE_RBAC_MATRIX[role],
      buildings: campusStore.buildings,
      rooms3D: campusStore.rooms3D,
      complaints: campusStore.complaints,
      workOrders: campusStore.workOrders,
      procurement: campusStore.procurement,
      sessions: perms.includes('system:sessions') ? campusStore.getAllSessions() : [],
      auditLogs: perms.includes('system:audit_logs') ? campusStore.auditLogs : [],
      users: perms.includes('system:rbac')
        ? campusStore.users.map((u) => campusStore.toPublicUser(u))
        : [],
      systemConfig: perms.includes('system:rbac') ? systemConfigState : undefined,
    });
  });

  // Student / Faculty / Facilities Admin: Raise a Complaint by Clicking a Room in the 3D Digital Twin
  app.post(
    '/api/campus/rooms3d/:id/complaint',
    requireAuth,
    requirePermission(['complaints:submit']),
    async (req: AuthenticatedRequest, res: Response) => {
      const room = campusStore.rooms3D.find((r) => r.id === req.params.id);
      if (!room) {
        res.status(404).json({ error: '3D Room not found' });
        return;
      }

      const { category, title, description, priority } = req.body as {
        category?: CampusComplaint['category'];
        title?: string;
        description?: string;
        priority?: CampusComplaint['priority'];
      };

      if (!title || !description) {
        res.status(400).json({ error: 'Issue title and description are required' });
        return;
      }

      const newComplaint: CampusComplaint = {
        id: `cmp-${Date.now()}`,
        code: `CMP-2026-${Math.floor(100 + Math.random() * 899)}`,
        buildingId: room.buildingId,
        buildingName: room.buildingName,
        roomId: room.id,
        locationDetail: `Floor ${room.floor} · ${room.roomCode} ${room.name}`,
        category: category || 'HVAC_THERMAL',
        title: title.trim(),
        description: description.trim(),
        reportedBy: req.auth!.fullName,
        reporterRole: req.auth!.role,
        status: 'OPEN',
        priority: priority || 'HIGH',
        aiAnalyzed: false,
        createdAt: new Date().toISOString(),
      };

      // Strictly 1 Gemini call per complaint analysis (Constraint #7)
      const diagnosis = await analyzeComplaintOnce(newComplaint);
      campusStore.complaints.unshift(newComplaint);

      room.operationalState = 'NOT_WORKING';
      room.repairProgress = 20;
      room.repairStageLabel = `Technician Dispatched · ${diagnosis.assignedSpecialty}`;
      room.assignedTechnician = `Marcus Thorne (${diagnosis.assignedSpecialty})`;
      room.eta = `${Math.max(10, Math.min(35, Math.round(diagnosis.estimatedRepairMinutes * 0.4)))} mins remaining`;
      room.equipmentHealth = Math.max(35, 100 - diagnosis.severityScore);
      room.activeComplaintIds = [newComplaint.id, ...room.activeComplaintIds];

      if (newComplaint.category === 'HVAC_THERMAL') {
        room.ac.status = 'FAULT';
        room.ac.tempC = Number((room.ac.setpointC + 3.6).toFixed(1));
      } else if (newComplaint.category === 'ELECTRICAL_GRID') {
        room.electricity.status = 'HARMONIC_FAULT';
      } else if (newComplaint.category === 'AV_CLASSROOM') {
        room.internet.status = 'DEGRADED';
      }

      if (room.equipmentList.length > 0) {
        room.equipmentList[0].status = 'NOT_WORKING';
        room.equipmentList[0].healthPercent = room.equipmentHealth;
      }

      campusStore.syncBuildingStatusFromRooms(room.buildingId);
      const updatedBuilding = campusStore.buildings.find((b) => b.id === room.buildingId);

      recordAndEmitAudit({
        userId: req.auth!.sub,
        userEmail: req.auth!.email,
        userRole: req.auth!.role,
        action: '3D_ROOM_COMPLAINT_RAISED',
        module: 'complaints:submit',
        ipAddress: req.ip || '10.24.1.44',
        status: 'WARNING',
        metadata: `${room.roomCode} marked NOT_WORKING (${newComplaint.code}) · AI Severity ${diagnosis.severityScore}/100`,
      });

      io.emit('complaint:created', newComplaint);
      io.emit('room3d:updated', room);
      if (updatedBuilding) io.emit('telemetry:update', updatedBuilding);

      res.json({ room, complaint: newComplaint, building: updatedBuilding });
    }
  );

  // Technician / Facilities Admin: Update Live Repair Progress & Complete Maintenance on a 3D Room
  app.post(
    '/api/campus/rooms3d/:id/repair',
    requireAuth,
    requirePermission(['workorders:execute', 'workorders:manage', 'facilities:mission_control']),
    (req: AuthenticatedRequest, res: Response) => {
      const room = campusStore.rooms3D.find((r) => r.id === req.params.id);
      if (!room) {
        res.status(404).json({ error: '3D Room not found' });
        return;
      }

      const { progress, stageLabel } = req.body as {
        progress: number;
        stageLabel?: string;
      };

      const clampedProgress = Math.max(0, Math.min(100, Number(progress)));
      room.repairProgress = clampedProgress;

      if (clampedProgress >= 100) {
        room.operationalState = 'WORKING';
        room.repairProgress = 100;
        room.repairStageLabel = 'All Systems Nominal · Verified Healthy';
        room.assignedTechnician = 'Standby — No Active Fault';
        room.eta = 'Nominal (0m)';
        room.lastMaintenance = `Just Now · Completed by ${req.auth!.fullName}`;
        room.equipmentHealth = 99;
        room.ac.status = 'OPTIMAL';
        room.ac.tempC = room.ac.setpointC;
        room.electricity.status = 'NOMINAL';
        room.internet.status = 'ONLINE';
        room.internet.speedMbps = 9650;
        room.internet.latencyMs = 1.6;
        room.equipmentList.forEach((eq) => {
          eq.status = 'WORKING';
          eq.healthPercent = 99;
        });

        campusStore.complaints.forEach((c) => {
          if (c.roomId === room.id || room.activeComplaintIds.includes(c.id)) {
            c.status = 'RESOLVED';
          }
        });
        room.activeComplaintIds = [];
      } else {
        room.operationalState = 'NOT_WORKING';
        room.repairStageLabel =
          stageLabel ||
          (clampedProgress >= 75
            ? 'Final Subsystem Calibration & Load Testing'
            : clampedProgress >= 45
            ? 'Technician On-Site · Replacing Faulty Actuator'
            : 'Technician Dispatched · Isolating Branch Circuit');
        room.eta = `${Math.max(4, Math.round(((100 - clampedProgress) / 100) * 30))} mins remaining`;
        room.equipmentHealth = Math.min(95, 45 + Math.round(clampedProgress * 0.5));
      }

      campusStore.syncBuildingStatusFromRooms(room.buildingId);
      const updatedBuilding = campusStore.buildings.find((b) => b.id === room.buildingId);

      recordAndEmitAudit({
        userId: req.auth!.sub,
        userEmail: req.auth!.email,
        userRole: req.auth!.role,
        action: clampedProgress >= 100 ? '3D_ROOM_MAINTENANCE_COMPLETED' : '3D_ROOM_REPAIR_PROGRESS',
        module: 'workorders:execute',
        ipAddress: req.ip || '10.24.1.44',
        status: 'SUCCESS',
        metadata: `${room.roomCode} repair -> ${clampedProgress}% (${room.operationalState}) by ${req.auth!.fullName}`,
      });

      io.emit('room3d:updated', room);
      if (updatedBuilding) io.emit('telemetry:update', updatedBuilding);

      res.json({ room, building: updatedBuilding });
    }
  );

  // Department Manager / Facilities Admin: Assign Technician & Set ETA on a 3D Room
  app.post(
    '/api/campus/rooms3d/:id/assign-technician',
    requireAuth,
    requirePermission(['workorders:manage', 'department:analytics', 'facilities:mission_control']),
    (req: AuthenticatedRequest, res: Response) => {
      const room = campusStore.rooms3D.find((r) => r.id === req.params.id);
      if (!room) {
        res.status(404).json({ error: '3D Room not found' });
        return;
      }

      const { technicianName, eta } = req.body as { technicianName?: string; eta?: string };
      if (technicianName) {
        room.assignedTechnician = technicianName;
        room.repairStageLabel = `Assigned to ${technicianName} · En Route`;
      }
      if (eta) {
        room.eta = eta;
      }

      recordAndEmitAudit({
        userId: req.auth!.sub,
        userEmail: req.auth!.email,
        userRole: req.auth!.role,
        action: '3D_ROOM_TECHNICIAN_ASSIGNED',
        module: 'workorders:manage',
        ipAddress: req.ip || '10.24.1.44',
        status: 'SUCCESS',
        metadata: `Assigned ${room.assignedTechnician} (ETA: ${room.eta}) to ${room.roomCode}`,
      });

      io.emit('room3d:updated', room);
      res.json({ room });
    }
  );

  // Faculty / Student / Facilities Admin: Toggle Room Booking Status inside 3D Room Panel
  app.post(
    '/api/campus/rooms3d/:id/booking',
    requireAuth,
    requirePermission(['rooms:booking', 'classrooms:av_env', 'facilities:mission_control']),
    (req: AuthenticatedRequest, res: Response) => {
      const room = campusStore.rooms3D.find((r) => r.id === req.params.id);
      if (!room) {
        res.status(404).json({ error: '3D Room not found' });
        return;
      }

      if (room.occupancy.status === 'AVAILABLE') {
        room.occupancy.status = 'ACTIVE_CLASS';
        room.occupancy.current = Math.min(room.occupancy.capacity, Math.max(12, room.occupancy.current + 14));
      } else {
        room.occupancy.status = 'AVAILABLE';
        room.occupancy.current = Math.max(2, Math.floor(room.occupancy.capacity * 0.15));
      }

      recordAndEmitAudit({
        userId: req.auth!.sub,
        userEmail: req.auth!.email,
        userRole: req.auth!.role,
        action: '3D_ROOM_BOOKING_UPDATED',
        module: 'rooms:booking',
        ipAddress: req.ip || '10.24.1.44',
        status: 'SUCCESS',
        metadata: `${room.roomCode} booking state -> ${room.occupancy.status} by ${req.auth!.fullName}`,
      });

      io.emit('room3d:updated', room);
      res.json({ room });
    }
  );

  // Room Environmental & Utility Controls inside the 3D Room Panel
  app.post(
    '/api/campus/rooms3d/:id/controls',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const room = campusStore.rooms3D.find((r) => r.id === req.params.id);
      if (!room) {
        res.status(404).json({ error: '3D Room not found' });
        return;
      }

      const { acSetpointC, toggleElectricityLoadShed } = req.body as {
        acSetpointC?: number;
        toggleElectricityLoadShed?: boolean;
      };

      if (typeof acSetpointC === 'number') {
        room.ac.setpointC = Number(acSetpointC.toFixed(1));
        if (room.operationalState === 'WORKING') {
          room.ac.tempC = room.ac.setpointC;
        }
      }

      if (typeof toggleElectricityLoadShed === 'boolean') {
        room.electricity.status = toggleElectricityLoadShed ? 'LOAD_SHED' : 'NOMINAL';
        room.electricity.loadKw = toggleElectricityLoadShed
          ? Number((room.electricity.loadKw * 0.8).toFixed(1))
          : Number((room.electricity.loadKw / 0.8).toFixed(1));
      }

      recordAndEmitAudit({
        userId: req.auth!.sub,
        userEmail: req.auth!.email,
        userRole: req.auth!.role,
        action: '3D_ROOM_UTILITY_TUNED',
        module: 'facilities:mission_control',
        ipAddress: req.ip || '10.24.1.44',
        status: 'SUCCESS',
        metadata: `Updated ${room.roomCode} -> AC Setpoint ${room.ac.setpointC}°C, Power: ${room.electricity.status}`,
      });

      io.emit('room3d:updated', room);
      res.json({ room });
    }
  );

  // Security Role: Toggle Building Lockdown & Verify Room CCTV Cameras / Clear Alerts
  app.post(
    '/api/campus/buildings/:id/security',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const building = campusStore.buildings.find((b) => b.id === req.params.id);
      if (!building) {
        res.status(404).json({ error: 'Building not found' });
        return;
      }

      const { toggleLockdown, roomId, clearRoomAlert } = req.body as {
        toggleLockdown?: boolean;
        roomId?: string;
        clearRoomAlert?: boolean;
      };

      if (typeof toggleLockdown === 'boolean') {
        building.securityLockdown = toggleLockdown;
      }

      let updatedRoom = undefined;
      if (roomId) {
        const room = campusStore.rooms3D.find((r) => r.id === roomId);
        if (room) {
          room.equipmentList.forEach((eq) => {
            if (eq.type === 'Camera' || clearRoomAlert) {
              eq.status = 'WORKING';
              eq.healthPercent = 100;
            }
          });
          if (clearRoomAlert) {
            room.repairStageLabel = `Security Patrol Cleared · CCTV Nominal (${req.auth!.fullName})`;
          }
          updatedRoom = room;
          io.emit('room3d:updated', room);
        }
      }

      io.emit('telemetry:update', building);
      res.json({ building, room: updatedRoom });
    }
  );

  // HOD Role: Escalate Room Issue to Critical Priority & Fast-Track Dispatch
  app.post(
    '/api/campus/rooms3d/:id/escalate',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const room = campusStore.rooms3D.find((r) => r.id === req.params.id);
      if (!room) {
        res.status(404).json({ error: '3D Room not found' });
        return;
      }

      room.statusLevel = 'CRITICAL';
      room.repairStageLabel = `HOD Escalated (${req.auth!.fullName}) · Priority Crew Dispatched`;
      room.eta = '6 mins remaining';
      if (room.repairProgress < 50) {
        room.repairProgress = 50;
      }

      campusStore.complaints.forEach((c) => {
        if (c.roomId === room.id || room.activeComplaintIds.includes(c.id)) {
          c.priority = 'CRITICAL';
          io.emit('complaint:analyzed', c);
        }
      });

      io.emit('room3d:updated', room);
      res.json({ room });
    }
  );

  // Single-Call Gemini Complaint Analysis Endpoint (Constraint #7)
  app.post(
    '/api/complaints/analyze',
    requireAuth,
    requirePermission(['complaints:analyze']),
    async (req: AuthenticatedRequest, res: Response) => {
      const { complaintId } = req.body as { complaintId?: string };
      const complaint = campusStore.complaints.find((c) => c.id === complaintId);
      if (!complaint) {
        res.status(404).json({ error: 'Complaint not found' });
        return;
      }

      const wasAlreadyAnalyzed = complaint.aiAnalyzed;
      const diagnosis = await analyzeComplaintOnce(complaint);

      recordAndEmitAudit({
        userId: req.auth!.sub,
        userEmail: req.auth!.email,
        userRole: req.auth!.role,
        action: wasAlreadyAnalyzed ? 'AI_COMPLAINT_CACHE_READ' : 'AI_COMPLAINT_SINGLE_CALL_EXECUTED',
        module: 'complaints:analyze',
        ipAddress: req.ip || '10.24.1.44',
        status: 'SUCCESS',
        metadata: `${complaint.code} -> Severity ${diagnosis.severityScore}/100 (${diagnosis.assignedSpecialty})`,
      });

      io.emit('complaint:analyzed', complaint);
      res.json({ complaint, diagnosis, cached: wasAlreadyAnalyzed });
    }
  );

  // Approve / Request Equipment Requests from 3D Room Panels (Procurement)
  app.post(
    '/api/campus/procurement/:id/decision',
    requireAuth,
    requirePermission(['procurement:approve']),
    (req: AuthenticatedRequest, res: Response) => {
      const item = campusStore.procurement.find((p) => p.id === req.params.id);
      if (!item) {
        res.status(404).json({ error: 'Requisition not found' });
        return;
      }

      const { decision } = req.body as { decision: 'APPROVED' | 'REJECTED' | 'ORDERED' };
      item.status = decision;
      item.approvedBy = req.auth!.fullName;

      if (decision === 'APPROVED' && item.roomId) {
        const room = campusStore.rooms3D.find((r) => r.id === item.roomId);
        if (room && room.operationalState === 'NOT_WORKING' && room.repairProgress < 75) {
          room.repairProgress = 75;
          room.repairStageLabel = `Equipment Request Approved (${item.reqCode}) · Installing`;
          room.eta = '8 mins remaining';
          io.emit('room3d:updated', room);
        }
      }

      recordAndEmitAudit({
        userId: req.auth!.sub,
        userEmail: req.auth!.email,
        userRole: req.auth!.role,
        action: `PROCUREMENT_${decision}`,
        module: 'procurement:approve',
        ipAddress: req.ip || '10.24.1.44',
        status: 'SUCCESS',
        metadata: `${item.reqCode} ($${item.amountUsd.toLocaleString()}) marked ${decision} by ${req.auth!.fullName}`,
      });

      io.emit('procurement:updated', item);
      res.json({ requisition: item });
    }
  );

  app.post(
    '/api/campus/procurement',
    requireAuth,
    requirePermission(['procurement:request', 'procurement:approve']),
    (req: AuthenticatedRequest, res: Response) => {
      const { itemTitle, vendor, buildingId, roomId, amountUsd, urgency } = req.body as {
        itemTitle: string;
        vendor: string;
        buildingId: string;
        roomId?: string;
        amountUsd: number;
        urgency: 'STANDARD' | 'EXPEDITED' | 'EMERGENCY';
      };

      const building =
        campusStore.buildings.find((b) => b.id === buildingId) || campusStore.buildings[0];
      const newReq = {
        id: `prc-${Date.now()}`,
        reqCode: `REQ-2026-${Math.floor(420 + Math.random() * 500)}`,
        itemTitle: itemTitle || 'Replacement HVAC Actuator Module',
        vendor: vendor || 'Siemens Smart Infrastructure',
        department: req.auth!.department,
        buildingId: building.id,
        buildingName: building.name,
        roomId,
        amountUsd: Number(amountUsd) || 4500,
        urgency: urgency || 'EXPEDITED',
        status: 'PENDING_APPROVAL' as const,
        requestedBy: req.auth!.fullName,
        slaCompliance: 99.1,
        createdAt: new Date().toISOString(),
      };

      campusStore.procurement.unshift(newReq);

      recordAndEmitAudit({
        userId: req.auth!.sub,
        userEmail: req.auth!.email,
        userRole: req.auth!.role,
        action: 'PROCUREMENT_REQ_SUBMITTED',
        module: 'procurement:request',
        ipAddress: req.ip || '10.24.1.44',
        status: 'SUCCESS',
        metadata: `${newReq.reqCode} ($${newReq.amountUsd.toLocaleString()}) submitted for ${newReq.buildingName}`,
      });

      io.emit('procurement:updated', newReq);
      res.json({ requisition: itemTitle ? newReq : newReq });
    }
  );

  // System Admin: User Management & System Configuration inside the 3D Digital Twin
  app.post(
    '/api/admin/sessions/:id/revoke',
    requireAuth,
    requirePermission(['system:sessions']),
    (req: AuthenticatedRequest, res: Response) => {
      const session = campusStore.redisSessions.get(req.params.id);
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      session.revoked = true;

      recordAndEmitAudit({
        userId: req.auth!.sub,
        userEmail: req.auth!.email,
        userRole: req.auth!.role,
        action: 'ADMIN_FORCE_REVOKE_SESSION',
        module: 'system:sessions',
        ipAddress: req.ip || '10.24.1.44',
        status: 'WARNING',
        metadata: `Revoked Redis session ${session.id} belonging to ${session.userEmail}`,
      });

      io.to(`session:${session.id}`).emit('session:revoked', {
        sessionId: session.id,
        reason: 'Terminated by System Administrator',
      });
      io.to(`role:${UserRole.SYSTEM_ADMIN}`).emit('session:updated', campusStore.getAllSessions());

      res.json({ sessions: campusStore.getAllSessions() });
    }
  );

  app.post(
    '/api/admin/users/:id/toggle-verify',
    requireAuth,
    requirePermission(['system:rbac']),
    (req: AuthenticatedRequest, res: Response) => {
      const user = campusStore.users.find((u) => u.id === req.params.id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      user.emailVerified = !user.emailVerified;

      recordAndEmitAudit({
        userId: req.auth!.sub,
        userEmail: req.auth!.email,
        userRole: req.auth!.role,
        action: 'ADMIN_USER_VERIFICATION_TOGGLED',
        module: 'system:rbac',
        ipAddress: req.ip || '10.24.1.44',
        status: 'SUCCESS',
        metadata: `Set emailVerified=${user.emailVerified} for ${user.email}`,
      });

      res.json({
        users: campusStore.users.map((u) => campusStore.toPublicUser(u)),
      });
    }
  );

  app.post(
    '/api/admin/system-config',
    requireAuth,
    requirePermission(['system:rbac']),
    (req: AuthenticatedRequest, res: Response) => {
      const patch = req.body as Partial<typeof systemConfigState>;
      Object.assign(systemConfigState, patch, {
        updatedAt: new Date().toISOString(),
        updatedBy: req.auth!.email,
      });

      recordAndEmitAudit({
        userId: req.auth!.sub,
        userEmail: req.auth!.email,
        userRole: req.auth!.role,
        action: 'SYSTEM_CONFIG_UPDATED',
        module: 'system:rbac',
        ipAddress: req.ip || '10.24.1.44',
        status: 'SUCCESS',
        metadata: `Updated system configuration: ZeroTrust=${systemConfigState.zeroTrustStrictMode}, AutoAI=${systemConfigState.autoAiTriageOnComplaint}`,
      });

      res.json({ systemConfig: systemConfigState });
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Campus360 Digital Twin Server + Socket.IO running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
