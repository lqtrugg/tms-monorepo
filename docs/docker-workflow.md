# Docker Workflow Notes

## Backend update checklist

When updating `tms-backend`, keep these contracts stable so Docker Compose keeps working:

1. Keep a working `dev` script in `tms-backend/package.json`.

   `docker-compose.yml` runs the backend with:

   ```yaml
   command: npm run dev
   ```

2. Keep the backend entry script aligned with `package.json`.

   The current backend entrypoint is:

   ```txt
   src/index.ts
   ```

   If this changes, update the `dev` script.

3. Read the backend port from the environment.

   Docker Compose passes:

   ```yaml
   PORT=${BACKEND_PORT}
   ```

   The backend should use `process.env.PORT`, not a hardcoded port.

4. Bind the backend so it is reachable from Docker.

   Binding to `0.0.0.0` is safe inside containers. Avoid binding only to `localhost`.

5. Do not use `localhost` for Postgres from inside the backend container.

   In Docker Compose, the database host is the service name:

   ```env
   DB_HOST=database
   DATABASE_URL=postgresql://postgres:postgres@database:5432/postgres
   ```

6. Add new backend packages to `tms-backend/package.json`.

   The backend Dockerfile installs dependencies from `package.json`.

7. Keep the Dockerfile workdir aligned with compose volumes.

   Backend Dockerfile:

   ```dockerfile
   WORKDIR /usr/app
   ```

   Backend compose volume:

   ```yaml
   - ./tms-backend:/usr/app/
   ```

8. Keep the anonymous `node_modules` volume for dev containers.

   ```yaml
   - /usr/app/node_modules
   ```

   This prevents local files from overwriting container-installed dependencies.

## Frontend update checklist

When replacing `tms-frontend` with another Vite-style frontend, keep these scripts in `tms-frontend/package.json`:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "start": "npm run build && vite preview --host 0.0.0.0"
  }
}
```

Docker Compose runs the frontend with:

```yaml
command: npm run dev
```

The frontend dev server should run on Vite's default port:

```env
FRONTEND_PORT=5173
FRONTEND_URL=http://localhost:5173
```

Do not copy these folders/files from external frontend bundles:

```txt
node_modules
dist
.DS_Store
```
