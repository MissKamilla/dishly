# Dishly

Full-stack recipe app bootstrap.

Stack:

- React + TypeScript + Vite
- NestJS + TypeScript
- PostgreSQL
- Redis
- Docker Compose

## Setup

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

```bash
cd apps/backend
npm install
```

```bash
cd apps/frontend
npm install
```

## Run

Infrastructure, from project root:

```bash
docker compose up -d
docker compose ps
```

Backend:

```bash
cd apps/backend
npm run start:dev
```

Frontend:

```bash
cd apps/frontend
npm run dev
```

URLs:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3000/health`

## Checks

```bash
cd apps/backend
npm run build
npm run lint
```

```bash
cd apps/frontend
npm run build
npm run lint
```
