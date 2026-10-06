# EOSS Sadhna Backend

Express + MongoDB backend for EOSS Sadhna.

## Run locally

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Health check:

```
GET http://localhost:5000/api/health
```

The backend currently starts even when MongoDB is not configured. MongoDB authentication and application modules will be added next.
