# Attendance sync and admin deployment

## Local backend and admin panel

1. Copy `.env.example` to `.env` and set a unique `ADMIN_EMAIL`, strong `ADMIN_PASSWORD`, and random `AUTH_TOKEN_SECRET` (at least 32 random bytes).
2. Run `npm run server` from the project root. The backend reads `.env` and listens on port 3001.
3. In another terminal, run `python3 -m http.server 4173` from `admin-web/`.
4. Open `http://localhost:4173`. Sign in with the admin credentials and leave the API URL as `http://localhost:3001/api` for local use.

## Production deployment

- Deploy the Express backend as a Node service with HTTPS. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_TOKEN_SECRET`, `CORS_ALLOWED_ORIGINS`, and `PORT` in the host's secret/environment settings. Do not commit `.env`. `CORS_ALLOWED_ORIGINS` should list the exact admin website origin(s), comma-separated.
- Keep `server/data/backend.db` on persistent storage and back it up. The SQLite setup should use one backend instance. For multiple instances or higher write traffic, migrate to a managed PostgreSQL database.
- Deploy `admin-web/` as a separate static website. The admin enters the backend's public HTTPS API URL at sign-in. Configure backend CORS to allow only the admin site and app origins before public deployment.
- Build the Expo app separately. Set `EXPO_PUBLIC_API_URL` to `https://<your-api-host>/api` when building the phone app. The app still records locally when offline and uploads queued rows when the network is available and the teacher has a valid server session.

## What sync stores

The app uploads an attendance row and its verification summary together. The server uses the attendance ID as an idempotency key and returns acknowledged IDs; only acknowledged records are marked synced on the phone. The admin API requires an admin-role bearer token; teacher API tokens cannot open the admin routes.

The backend validates the signed-in teacher, required record fields, geofence/accuracy assertions, and required verification check statuses before storing a row. Those verification details originate on the phone; this server does not independently rerun the camera, speech, or face models.
