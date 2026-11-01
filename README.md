# Agrico backend

Independent local copy of RS Education, created 29 October 2026.

- Frontend: http://localhost:3003
- CMS: http://localhost:1340/admin
- Database: agrico (isolated local MySQL user, credentials in backend .env)

Dependencies are copied locally. Run npm ci when reinstalling.

Run npm run build, then npm run develop. Create the first CMS admin at the admin URL. Database schema and public read permissions initialize on first boot.

Source design/layout is inherited. Client contacts, approved artwork, real content and deployment settings still need configuration. No source client records, accounts, API tokens, uploads or SMTP credentials were copied. Optional local seed/configure scripts target only this client database.

No Git remote is configured; this folder is an independent working copy.

Start both local servers after building the backend: powershell -ExecutionPolicy Bypass -File D:/agrico-backend/scripts/start-client.ps1. Logs and process IDs are in the backend/frontend logs folders. Run it once per session.
