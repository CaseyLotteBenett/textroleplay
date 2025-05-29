# Text Role Play Platform

Multiplayer text-based RPG platform with real-time chat functionality.

## Architecture

- **Frontend**: React + Vite (deployed on Vercel)
- **Backend**: Node.js + Express + WebSockets (deployed on Fly.io)
- **Database**: Supabase PostgreSQL

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=your-backend-url
```

### Backend (.env)
```
DATABASE_URL=your-supabase-connection-string
PORT=8080
```

## Deployment

1. Frontend: Deploy to Vercel
2. Backend: Deploy to Fly.io
3. Database: Supabase PostgreSQL