# SHIVASHA

**SHIVASHA — Social • Connect • Share** is a React-based social community platform with a Node.js/Express API and MongoDB data store.

## Links

- **Live frontend:** https://devops-saurabhpandey.github.io/ktl_rto/
- **Frontend documentation:** [FRONTEND.md](./FRONTEND.md)
- **Backend source:** [server/](./server/)
- **GitHub Actions deployments:** https://github.com/devops-saurabhpandey/ktl_rto/actions

## Technology Stack

- Frontend: React 19, Vite 7, CSS
- API: Node.js, Express
- Database: MongoDB/Mongoose
- Authentication: JSON Web Tokens (JWT)
- Real-time features: Socket.IO
- Frontend hosting: GitHub Pages

## Features in the current codebase

- Login and registration UI
- Social feed, post creation, likes, comments, replies and reposts
- User profiles, discovery, search and follow actions
- Saved posts, hashtags and notifications
- Direct messaging and real-time presence/typing integration
- User report/moderation UI

Features that use data or authentication require the backend service and database to be configured and running.

## Frontend Quick Start

Requirements: Node.js and npm.

```bash
git clone https://github.com/devops-saurabhpandey/ktl_rto.git
cd ktl_rto
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

The generated static site is placed in `dist/`.

## Backend Quick Start

```bash
cd server
npm install
npm start
```

Configure the backend environment variables before starting it:

- `MONGODB_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — long, random private secret
- `FRONTEND_URL` — `https://devops-saurabhpandey.github.io/ktl_rto`

See [server/.env.example](./server/.env.example) for the variable names. Create a private local `.env` file; do not commit secrets.

## Deployment Notes

GitHub Pages serves the frontend from the `/ktl_rto/` path. The frontend build uses the `VITE_API_URL` GitHub Actions repository variable to choose the deployed backend URL. Set it to the public HTTPS URL of the backend service, without a trailing slash, and rerun the deployment workflow.

A successful frontend build/deployment does not by itself verify backend availability, MongoDB connectivity, login, uploads, or messaging. Test those separately after backend deployment.

## Security

- Never commit database credentials, JWT secrets, or other private keys.
- Do not put private secrets in frontend environment variables; frontend variables are included in the browser build.
- Validate permissions and user input on the backend for all privileged actions.
