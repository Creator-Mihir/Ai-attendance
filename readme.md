Frontend folder structure

teacher-attendance-app/
│
├── README.md
├── package.json
├── tsconfig.json
├── app.json
├── eas.json
├── nativewind.config.js
├── tailwind.config.js
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── app/
│   │
│   ├── _layout.tsx
│   │
│   ├── index.tsx
│   │
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx
│   │   ├── login.tsx
│   │   ├── otp.tsx
│   │   └── device-setup.tsx
│   │
│   ├── (onboarding)/
│   │   ├── _layout.tsx
│   │   ├── teacher-profile.tsx
│   │   ├── face-registration.tsx
│   │   └── setup-complete.tsx
│   │
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── attendance.tsx
│   │   ├── history.tsx
│   │   └── profile.tsx
│   │
│   ├── attendance/
│   │   ├── index.tsx
│   │   ├── camera.tsx
│   │   ├── liveness.tsx
│   │   ├── location.tsx
│   │   ├── verification.tsx
│   │   ├── success.tsx
│   │   └── failed.tsx
│   │
│   ├── verification/
│   │   ├── index.tsx
│   │   ├── challenge.tsx
│   │   ├── camera.tsx
│   │   └── result.tsx
│   │
│   └── settings/
│       ├── index.tsx
│       ├── security.tsx
│       ├── device.tsx
│       └── about.tsx
│
├── src/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── buttons/
│   │   ├── cards/
│   │   ├── feedback/
│   │   ├── camera/
│   │   ├── location/
│   │   └── attendance/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── attendance/
│   │   ├── verification/
│   │   ├── profile/
│   │   ├── history/
│   │   └── settings/
│   │
│   ├── database/
│   │   ├── database.ts
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── repositories/
│   │       ├── teacher.repository.ts
│   │       ├── attendance.repository.ts
│   │       ├── verification.repository.ts
│   │       └── sync.repository.ts
│   │
│   ├── services/
│   │   ├── attendance.service.ts
│   │   ├── verification.service.ts
│   │   ├── location.service.ts
│   │   ├── camera.service.ts
│   │   ├── biometric.service.ts
│   │   ├── device.service.ts
│   │   ├── network.service.ts
│   │   └── sync.service.ts
│   │
│   ├── sync/
│   │   ├── sync-engine.ts
│   │   ├── sync-queue.ts
│   │   ├── sync-manager.ts
│   │   └── sync-types.ts
│   │
│   ├── store/
│   │   ├── auth.store.ts
│   │   ├── attendance.store.ts
│   │   ├── teacher.store.ts
│   │   ├── network.store.ts
│   │   └── app.store.ts
│   │
│   ├── api/
│   │   ├── client.ts
│   │   ├── endpoints.ts
│   │   └── types.ts
│   │
│   ├── domain/
│   │   ├── attendance/
│   │   ├── verification/
│   │   ├── teacher/
│   │   └── sync/
│   │
│   ├── hooks/
│   │   ├── useAttendance.ts
│   │   ├── useLocation.ts
│   │   ├── useNetwork.ts
│   │   ├── useSync.ts
│   │   └── useCamera.ts
│   │
│   ├── utils/
│   │   ├── date.ts
│   │   ├── validation.ts
│   │   ├── permissions.ts
│   │   └── device.ts
│   │
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── config.ts
│   │   └── attendance.ts
│   │
│   ├── types/
│   │   ├── teacher.ts
│   │   ├── attendance.ts
│   │   ├── verification.ts
│   │   ├── location.ts
│   │   └── sync.ts
│   │
│   └── theme/
│       ├── colors.ts
│       ├── typography.ts
│       └── spacing.ts
│
└── tests/
    ├── unit/
    └── integration/


   * Flow of the project
                   USER
                 │
                 ▼
             UI ACTION
                 │
                 ▼
        Attendance Service
                 │
                 ▼
        Local Validation
                 │
        ┌────────┴────────┐
        │                 │
       PASS              FAIL
        │                 │
        ▼                 ▼
   Save locally       Show reason
        │
        ▼
   SQLite Database
        │
        ▼
    Sync Queue
        │
        │ internet available
        ▼
    Future API
        │
        ▼
     Backend



HOME
 │
 ▼
Mark Attendance
 │
 ▼
Permission Check
 │
 ├── Camera permission
 ├── Location permission
 └── Device checks
 │
 ▼
Location Verification
 │
 ├── Inside geofence ──► Continue
 └── Outside ───────────► Reject
 │
 ▼
Liveness Verification
 │
 ├── Pass ──► Continue
 └── Fail ──► Retry
 │
 ▼
Face Recognition
 │
 ├── Match ──► Continue
 └── No Match ──► Reject
 │
 ▼
Device Integrity
 │
 ├── Valid ──► Continue
 └── Suspicious ──► Reject
 │
 ▼
ATTENDANCE MARKED
 │
 ▼
Save to SQLite
 │
 ▼
Add to Sync Queue
 │
 ├── Internet available
 │        ↓
 │      Sync
 │
 └── Offline
          ↓
     Keep locally     



full detail of the project 

AI-Powered Teacher Attendance System
1. Project Overview
This is an AI-powered teacher attendance and presence monitoring mobile application.
The system is designed to reduce proxy attendance and verify that a teacher is:
The correct person
Physically present at the authorized location
Using a legitimate/trusted device
Continuously present when periodic verification is required
The system will eventually combine:
Facial recognition
Liveness detection
Geolocation/geofencing
Device integrity verification
Periodic/random presence verification
Offline-first attendance recording
Automatic synchronization with the backend
Important
The current development phase is FRONTEND ONLY.
Do not implement the backend, database server, API server.will add later or connect to backend so make accordingly, 
The frontend must be architected so that these can be connected later without restructuring the application.

2. Primary Technology Stack
Use:
React Native
Expo
TypeScript
Expo Router
NativeWind
Zustand
TanStack Query
SQLite
Expo SecureStore
React Hook Form
Zod
Expo Camera
Expo Location
NetInfo
Reanimated
Lucide icons
Use TypeScript strictly.
Avoid unnecessary dependencies.

3. Core Architecture Principle
The application is OFFLINE-FIRST.
The backend is NOT the source that controls whether the UI works.
The local application must be capable of:
opening
displaying teacher information
displaying attendance history
performing local verification flows
creating attendance records
storing attendance records
storing verification results
adding unsynchronized records to a queue
displaying sync status
Internet availability must not prevent the application from functioning where local verification is possible.

4. Architecture
Use the following architecture:
UI↓Feature Layer↓Service Layer↓Repository Layer↓Local SQLite Database
The synchronization system is separate:
Local Database↓Sync Queue↓Sync Manager↓Future Backend API
Never make UI components directly dependent on API calls.

5. Important Rule
NEVER write code like:
Button -> API -> Backend -> UI
Instead use:
Button
↓
Feature handler
↓
Service
↓
Repository
↓
Local database
↓
Sync queue
The API should only be used by the synchronization layer.

6. Folder Structure
as mentioned above 
Keep navigation files inside app/.
Keep application logic inside src/.

7. UI Architecture
Components must be reusable.
Create:
src/components/ui/
for:
Button
Card
Input
Badge
Modal
BottomSheet
Loader
EmptyState
ErrorState
StatusIndicator
OfflineBanner
Create feature-specific components inside their feature folders.
Do not put business logic inside reusable UI components.

8. Attendance Feature
The attendance flow should be:
Home
↓
Mark Attendance
↓
Permission Check
↓
Location Verification
↓
Liveness Verification
↓
Face Recognition
↓
Device Verification
↓
Attendance Result
↓
Save Locally
↓
Add Sync Queue Item
Every stage must have:
loading state
success state
failure state
retry state

9. Offline Behaviour
The application must always know its network state.
Display:
Online
when connected.
Display:
Offline
Attendance will sync automatically
when disconnected.
If unsynchronized records exist:
3 records waiting to sync
After successful synchronization:
All data synced
Offline mode must NOT look like an application error.

10. Local Database
Use SQLite for persistent application data.
Main entities:
Teacher
{
  id: string;
  employeeId: string;
  name: string;
  schoolId: string;
  department?: string;
  phone?: string;
  faceRegistered: boolean;
  createdAt: string;
  updatedAt: string;
}
Attendance
{
  id: string;
  teacherId: string;
  date: string;
  checkInTime: string;
  latitude: number;
  longitude: number;
  status: "present" | "rejected" | "pending";
  verificationStatus: "verified" | "failed" | "pending";
  syncStatus: "synced" | "pending" | "failed";
  createdAt: string;
}
Verification
{
  id: string;
  attendanceId: string;
  type: "initial" | "random" | "exit";
  livenessScore?: number;
  faceMatchScore?: number;
  locationVerified: boolean;
  deviceVerified: boolean;
  status: "passed" | "failed";
  timestamp: string;
}
Sync Queue
{
  id: string;
  entityType: "attendance" | "verification";
  entityId: string;
  operation: "CREATE" | "UPDATE";
  payload: string;
  status: "pending" | "processing" | "failed";
  retryCount: number;
  createdAt: string;
}

11. Repository Pattern
Use repositories between services and SQLite.
Example:
attendance.service.ts
        ↓
attendance.repository.ts
        ↓
SQLite
Do not access SQLite directly from screens.
Example interface:
interface AttendanceRepository {
  create(attendance: Attendance): Promise<void>;
  getById(id: string): Promise<Attendance | null>;
  getByDate(date: string): Promise<Attendance[]>;
  getPendingSync(): Promise<Attendance[]>;
  updateSyncStatus(
    id: string,
    status: SyncStatus
  ): Promise<void>;
}

12. Service Layer
Create services for:
attendance.service.ts
verification.service.ts
location.service.ts
camera.service.ts
biometric.service.ts
device.service.ts
network.service.ts
sync.service.ts
Services contain business logic.
Screens should call services rather than implementing business logic.

13. Hardware Abstraction
Do not tightly couple business logic to native APIs.
Use interfaces.
Example:
interface LocationService {
  getCurrentLocation(): Promise<LocationResult>;
  isInsideGeofence(
    location: LocationResult
  ): Promise<boolean>;
}
Implement a mock service initially.
Later replace it with the real implementation.
Use the same pattern for:
CameraService
LocationService
LivenessService
FaceRecognitionService
BiometricService
DeviceIntegrityService

14. Mock Services
Because the backend and AI models are not implemented yet, create mock implementations.
Examples:
MockLocationService
MockLivenessService
MockFaceRecognitionService
MockDeviceIntegrityService
MockAttendanceService
These must behave realistically enough to test the UI.
Do not hard-code mock logic directly into screens.

15. Present AI Integration
The following are integrationswe need:
Face recognition
Face embeddings
Liveness detection
Expression analysis
Lip movement analysis
Audio-visual synchronization
Speech recognition
Device integrity
The frontend must only define interfaces for these systems for now.
Example:
interface LivenessService {
  startVerification(): Promise<LivenessResult>;
}
Current implementation:
OnDeviceLivenessService


16. Future Backend Integration
Do not implement backend endpoints now.
Create API abstraction:
src/api/
├── client.ts
├── endpoints.ts
└── types.ts
Future APIs may include:
POST /auth/login
POST /auth/verify-otp
POST /attendance
GET  /attendance/history
POST /attendance/sync
POST /verification
GET  /teacher/profile
These are placeholders only.
Do not call real endpoints yet.

17. Sync Architecture
Create:
src/sync/
├── sync-engine.ts
├── sync-queue.ts
├── sync-manager.ts
└── sync-types.ts
Synchronization should:
Detect network availability
Read pending queue items
Send records to the backend
Confirm successful synchronization
Mark local records as synced
Retry failed operations
Avoid duplicate submissions
The sync system must be independent from the UI.

18. UI Design
The UI should be:
modern
clean
professional
simple
fast
accessible
touch-friendly
Do not create an overly futuristic AI interface.
The teacher should be able to understand the application immediately.
Primary screen priority:
Today's Attendance
        ↓
Mark Attendance
        ↓
Verification Status
        ↓
Recent Attendance
Use large touch targets.
Use clear status indicators.
Use subtle animations only where they improve feedback.

19. Home Screen
The home screen should contain:
Greeting
Teacher information

Today's attendance card

Mark Attendance button

Verification/device status

Recent attendance

Sync status
Primary CTA:
Mark Attendance
must be visually dominant.

20. Attendance Screen
Show the verification progress:
1. Location
2. Liveness
3. Face
4. Device
5. Complete
The user should always know which step is currently running.
Example:
Location
✓ Verified

Liveness
● Checking...

Face
○ Waiting

Device
○ Waiting

21. Error Handling
Never show technical errors such as:
SQLite constraint error
TypeError
Network request failed
to the user.
Convert them into human-readable messages.
Example:
Unable to verify your location.

Please make sure:
• Location is enabled
• You are inside the school area
• Location permission is allowed

[Try Again]

22. Performance Rules
The app should be fast.
Rules:
Avoid unnecessary re-renders
Use memoization where useful
Keep screens lightweight
Do not load large data unnecessarily
Use paginated history
Cache local data
Avoid unnecessary API requests
Lazy load heavy features
Keep camera processing isolated
Do not store large images unnecessarily
Prefer local computation where appropriate
Avoid global state for temporary UI state

23. Security Rules
Never store sensitive credentials in plain AsyncStorage.
Use SecureStore for:
authentication tokens
device secrets
sensitive configuration
Do not store raw face images unless explicitly required.
Prefer storing references or derived data later when the real biometric architecture is implemented.

24. Coding Rules
Use:
TypeScript
ESLint
Prettier
strict typing
small reusable components
feature-based architecture
Avoid:
any
large monolithic components
business logic inside JSX
direct database access from components
direct API calls from components
duplicate components
hard-coded colors everywhere
hard-coded mock data throughout the application

25. Development Phases
Phase 1 — UI
Build:
navigation
onboarding
home
attendance
history
profile
settings
verification UI
Use mock data.

Phase 2 — Local Database
Implement:
SQLite
teacher storage
attendance storage
verification storage
sync queue

Phase 3 — Offline Logic
Implement:
offline detection
local attendance creation
local verification state
pending synchronization
sync status UI

Phase 4 — Hardware
Implement:
camera
GPS
biometric authentication
device information
permissions

Phase 5 — AI
Implement:
face recognition
liveness detection
expression analysis
audio-visual verification

Phase 6 — Backend
Connect:
Mobile App
↓
Sync Engine
↓
API
↓
Backend
↓
Database
Do not redesign the frontend architecture during this phase.

26. Important Development Rule
When implementing a feature, always ask:
Can this feature work without the internet?
If yes, implement the local-first version.
If no, isolate the network dependency behind the API/sync layer.
The frontend must remain usable even when the server is unavailable.

27. Current Scope
CURRENTLY BUILD ONLY:
✓ React Native app
✓ Expo
✓ TypeScript
✓ NativeWind
✓ Navigation
✓ UI
✓ Mock services
✓ Local architecture
✓ SQLite architecture
✓ Offline state
✓ Sync queue architecture
✓ Attendance flow
✓ Verification flow
✓ History
✓ Profile
✓ Settings
DO NOT BUILD YET:
✗ Backend
✗ PostgreSQL server
✗ Real authentication API
✗ Real AI models
✗ Cloud storage
✗ Production API
✗ Admin dashboard

28. Definition of Done for Frontend Phase
The frontend phase is complete when a developer can:
Install the application
Open it without internet
Complete onboarding using mock services
Open the home screen
Start attendance
Complete the mock verification flow
Create an attendance record
Close and reopen the application
See the attendance record
See offline status
See pending synchronization
Enable internet
See synchronization execute through the sync abstraction
See the record change to synced
The backend and AI implementations should be replaceable without changing the screen architecture.

