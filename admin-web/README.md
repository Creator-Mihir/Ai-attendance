# Attendance Admin Web

This is a standalone static web app. It is served separately from the Expo teacher app and talks to the Express API.

## Local setup

1. In the project root, copy `.env.example` to `.env` and set a unique admin email, strong password, random `AUTH_TOKEN_SECRET`, and the admin site's origin in `CORS_ALLOWED_ORIGINS`.
2. Start the backend with `npm run server`.
3. Serve this folder with a static web server, for example `python3 -m http.server 4173` from `admin-web/`.
4. Open `http://localhost:4173` and sign in with the configured admin credentials. The API URL defaults to `http://localhost:3001/api`.

## Deployment

Deploy the contents of this directory to any static hosting service. Set the API URL in the sign-in form to the public HTTPS API URL. Deploy the backend separately and set `AUTH_TOKEN_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` as host environment secrets. Never commit `.env` or put admin credentials in this static site.

The backend currently uses SQLite in `server/data/backend.db`. Production hosting must preserve this file across redeploys and provide backups. Use a persistent volume with one backend instance for a small pilot; use managed PostgreSQL before scaling to multiple backend instances.

## Data boundary

The panel displays server-synchronized attendance rows and verification summaries. Face embeddings and captured audio/video are not exposed by the admin API. Offline attendance remains on the device until the sync queue successfully uploads it.


start command
npm run admin