# Campus360 — Cinematic Startup Experience, Role Portals & Automated Hackathon Demo Plan (Sections 19–23)

## 1. Architectural Overview & Startup Flow

We will upgrade the startup, authentication entry, and demonstration experience while preserving all backend APIs, PostgreSQL/pgvector queries, Redis caching, Socket.IO real-time channels, and the single-call Gemini AI complaint analysis pipeline.

### Application Startup Lifecycle
```text
Campus360 Animated Splash Screen
       ↓
Cinematic Full-Screen Landing Page (with Interactive 3D Wireframe Hologram & Scroll Sections)
       ↓
Dedicated Portal Selection Page (7 Large Animated Role Cards)
       ↓
Role-Themed Login Page (7 Role Color Themes + Remember Me / Forgot Password + Demo Login)
       ↓
Role Dashboard
       ↓
3D Campus Digital Twin (with Optional 19-Step Self-Driving Hackathon Demo Director)
```

---

## 2. Planned Component & State Enhancements

### A. Section 19: Campus360 Splash Screen & Cinematic Landing Experience (`/src/components/auth/LoginPage.tsx` & `/src/components/auth/CampusHologramCanvas.tsx`)
1. **Animated Campus360 Splash Screen (`SPLASH` stage)**:
   - Smooth 1.8-second sequenced entry featuring an animated 3D geometric Campus360 emblem, subtle glowing particle field, progress sweep, and an instant `"Skip Intro"` action.
   - Automatically transitions with a smooth camera/opacity fade into the Cinematic Landing Page.
2. **Interactive 3D Wireframe Hologram & Particle Field**:
   - Dedicated lightweight WebGL / HTML5 3D projection canvas (`CampusHologramCanvas.tsx`) rendering a slow-rotating futuristic campus wireframe hologram (5 smart buildings, orbital telemetry rings, and floating particle field) layered over the live 3D Digital Twin backdrop.
   - Interactive mouse-parallax tilt and smooth orbital rotation.
3. **Full-Screen Scrollable Enterprise Landing Page (`LANDING` stage)**:
   - **Top Bar Contract**: Clean 3-zone header (`Campus360` wordmark, section jump links `Features · AI Engine · Statistics · Portals`, and primary CTA `"Enter Campus360"`).
   - **Hero Section**:
     - Headline: `"Campus360 – Intelligent Smart Campus Digital Twin"`
     - Concise enterprise subtitle explaining unified spatial operations, AI triage, and real-time building telemetry.
     - Primary CTA: Large `"Enter Campus360"` button (navigates to Portal Selection).
     - Secondary CTA: `"Watch Demo / Start Demo"` button (launches the 19-step automated Hackathon Demo Mode).
   - **5 Floating Glassmorphic Feature Cards**:
     1. *AI Complaint Analysis* — Single-call Gemini root-cause diagnostics, severity scoring, and pgvector semantic duplicate detection.
     2. *Live Digital Twin* — Interactive 3D campus, buildings, exploded floor slabs, and room-level inspection.
     3. *Real-Time Monitoring* — Sub-second Socket.IO and Redis pub/sub telemetry across HVAC, microgrid, and occupancy sensors.
     4. *Predictive Maintenance* — Automated technician dispatch, ETA tracking, and live 3D room repair state transitions.
     5. *Smart Resource Management* — Lecture hall bookings, classroom climate control, and capital equipment lifecycle tracking.
   - **Live Statistics Section**:
     - Tabular-numeral (`tabular-nums`) counters for **Buildings (5)**, **Floors (13)**, **Rooms (55+ / 11 Interactive 3D Zones)**, **Equipment (320+ Assets)**, and **IoT Sensors (1,480+ Live Nodes)** with scroll-triggered entrance transitions.

---

### B. Section 20: Dedicated Portal Selection Page (`PORTAL_SELECTION` stage in `/src/components/auth/LoginPage.tsx`)
1. **7 Large Animated Role Portal Cards**:
   - Displayed in a spacious, responsive enterprise grid (never a login form).
   - **Portals Included**:
     1. **Student** (`UserRole.STUDENT`) — Blue theme (`#38BDF8`)
     2. **Faculty** (`UserRole.FACULTY`) — Purple theme (`#A855F7`)
     3. **Maintenance** (`UserRole.TECHNICIAN`) — Orange theme (`#F97316`)
     4. **Security** (`UserRole.PROCUREMENT_APPROVER`) — Red theme (`#EF4444`)
     5. **Admin** (`UserRole.FACILITIES_ADMIN`) — Teal theme (`#14B8A6`)
     6. **HOD** (`UserRole.DEPARTMENT_MANAGER`) — Indigo theme (`#6366F1`)
     7. **Super Admin** (`UserRole.SYSTEM_ADMIN`) — Gold theme (`#EAB308`)
2. **Card Anatomy & Micro-Interactions**:
   - Large modern role icon in a glowing glass container, role title, concise description of spatial permissions, custom gradient surface, hover lift + border glow animation, and click transition opening that role's themed login page.

---

### C. Section 21: Role-Themed Login Pages (`ROLE_LOGIN` stage in `/src/components/auth/LoginPage.tsx`)
1. **Strict Role Color Palette & Shared Design Language**:
   - **Student**: Blue (`#38BDF8` / Sky-Blue glow)
   - **Faculty**: Purple (`#A855F7` / Violet-Purple glow)
   - **Maintenance**: Orange (`#F97316` / Amber-Orange glow)
   - **Security**: Red (`#EF4444` / Crimson-Red glow)
   - **Admin**: Teal (`#14B8A6` / Teal-Cyan glow)
   - **HOD**: Indigo (`#6366F1` / Indigo-Blue glow)
   - **Super Admin**: Gold (`#EAB308` / Amber-Gold glow)
2. **Login Page Features**:
   - Large role icon + role-tailored welcome headline and persona badge.
   - **Email field** and **Password field** (pre-filled with role demo credentials for frictionless evaluation, editable for manual login).
   - **Remember Me** checkbox and **Forgot Password (demo modal/toast preview)** interactive flow.
   - **Demo Login button** (1-click instant role authentication) alongside the standard **Login button**.
   - **Animated Side Illustration**: Custom role-themed SVG vector hologram + live capability highlights inside a frosted glassmorphism panel.

---

### D. Section 22: Automated 19-Step Hackathon Demo Mode (`/src/components/demo/HackathonDemoDirector.tsx`)
1. **Self-Driving 60–90 Second Choreography**:
   - Triggered from the Landing Page (`"Watch Demo"` / `"Start Demo"`) or from the top bar.
   - Executes all **19 steps** automatically with smooth camera flights, real state updates, and narrated toast cards:
     1. **Open Landing Page**: Highlight Campus360 hero and initiate automated tour.
     2. **Select Student Portal**: Navigate to Portal Selection and highlight the Blue Student Portal card.
     3. **Demo Login**: Open Student Login and trigger automated Student demo authentication.
     4. **Open Digital Twin**: Enter the Student Portal with the 3D Campus Digital Twin centered.
     5. **Zoom into a Building**: Smoothly fly camera to **Quantum & Photonics Atrium (Block B / `bldg-sci-02`)**.
     6. **Select Floor**: Expand building floors vertically and focus on **Floor 3**.
     7. **Select Room**: Select **Photonics & Laser Lab (`room-sci-302`)** and highlight room telemetry.
     8. **Submit a Sample Complaint**: Open/display the complaint submission for `"High-output laser cooling chiller loop pressure drop & thermal alarm"` in `room-sci-302`.
     9. **AI Analyzes Complaint**: Show live AI root-cause diagnosis, confidence score, and pgvector duplicate check (`0` extra Gemini calls during demo replay if cached/simulated, or standard single-call pipeline).
     10. **Complaint Becomes Critical**: Escalate severity to `CRITICAL` (`P1`).
     11. **Building Changes Color**: Transition building & room status to `CRITICAL` (pulsing crimson alert state in the 3D Digital Twin).
     12. **Maintenance Dashboard Receives Live Notification**: Render live Picture-in-Picture (PiP) **Maintenance Alert Card** (Orange theme) showing incoming dispatch queue notification.
     13. **Admin Dashboard Receives Alert**: Render live Picture-in-Picture (PiP) **Admin Mission Control Alert Card** (Teal theme) showing thermal anomaly & SLA timer.
     14. **Security Dashboard Receives Alert**: Render live Picture-in-Picture (PiP) **Security Surveillance Alert Card** (Red theme) showing lab safety perimeter advisory.
     15. **Technician is Assigned**: Auto-assign specialist **Rahul Verma** with target ETA (`9 mins remaining`).
     16. **Technician Reaches Room**: Animate technician arrival indicator at `room-sci-302` in the 3D scene.
     17. **Room Status Changes to Under Maintenance**: Transition room status to `MAINTENANCE` (Amber/Blue active repair state) with live repair progress (`35% → 75% → 100%`).
     18. **Complaint Resolved**: Mark complaint `RESOLVED` and log completion in the room maintenance history.
     19. **Building Returns to Healthy**: Restore `room-sci-302` and `bldg-sci-02` to `HEALTHY` / `NOMINAL` emerald state and orbit camera out to a celebratory campus overview.
2. **Floating Director HUD**:
   - Positioned cleanly at the top-center/bottom-center without obstructing the 3D model.
   - Displays current **Step `X / 19`**, step title, animated progress bar, **Pause / Resume**, **Previous / Next Step**, **Speed Toggle (`1x` / `1.5x` / `2x`)**, and **Exit Demo**.

---

### E. Section 23: Hackathon Judge Polish
- Enforce generous spacing, crisp typography (`Plus Jakarta Sans` display + `DM Sans` body + `JetBrains Mono` tabular numerals), glassmorphism surfaces, and smooth transitions across Splash, Landing, Portal Selection, Role Login, and the 3D Digital Twin workspace.
- Verify zero TypeScript or lint errors via `lint_applet` and `compile_applet`.
