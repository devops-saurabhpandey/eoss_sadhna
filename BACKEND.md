# SHIVASHA Backend Guide

SHIVASHA uses a Node.js + Express API, MongoDB/Mongoose for persistence, JWT for authentication, and Socket.IO for real-time events.

## Architecture

- **Runtime:** Node.js (ES modules)
- **API:** Express 5
- **Database:** MongoDB Atlas or another MongoDB deployment
- **Authentication:** JSON Web Tokens (JWT); passwords are hashed with bcrypt
- **Real-time:** Socket.IO
- **Optional image storage:** Cloudinary
- **Deployment configuration:** `server/render.yaml` for Render

## Run locally

Use a supported, current Node.js LTS release.

```bash
git clone https://github.com/devops-saurabhpandey/ktl_rto.git
cd ktl_rto/server
npm install
cp .env.example .env
```

Edit `.env` with your own MongoDB connection string and a long, private JWT secret, then run:

```bash
npm run dev
```

The API defaults to port 5000. Check it at:

- `GET http://localhost:5000/api`
- `GET http://localhost:5000/api/health`

The health response reports API status, whether Mongoose is connected, and whether real-time support is enabled. A healthy HTTP response does **not** by itself mean MongoDB is connected.

## Environment variables

| Variable | Required? | Purpose |
| --- | --- | --- |
| `PORT` | No | Listening port; defaults to `5000`. |
| `MONGODB_URI` | For data features | MongoDB connection string. If omitted, the server currently starts without a database, but database-backed features will not work. |
| `JWT_SECRET` | Yes | Private signing key for login tokens and Socket.IO authentication. Use a long, random value; never commit it. |
| `FRONTEND_URL` | Recommended in production | Allowed frontend origin(s). Multiple comma-separated origins are supported by the current server code. |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary cloud name for image uploads. |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API secret; keep private. |

Copy `server/.env.example` to `.env` and replace the example values. Do not commit `.env`, real credentials, database passwords, or production tokens.

## API overview

Base URL for local development: `http://localhost:5000`

Except for the health/root endpoints and registration/login, the routes below require a valid bearer token:

```http
Authorization: Bearer <JWT>
```

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api` | API welcome/status message |
| GET | `/api/health` | Service and database status |
| POST | `/api/auth/register` | Register an account |
| POST | `/api/auth/login` | Log in and receive a JWT |
| GET, PATCH | `/api/users/me` | Read or update your profile |
| GET | `/api/users/discover` | Discover users |
| GET | `/api/users/search?q=...` | Search users |
| GET | `/api/users/:id` | View a profile and its recent posts |
| GET | `/api/users/:id/connections?type=followers` | List followers or following |
| POST | `/api/users/:id/follow` | Follow/unfollow a user |
| POST | `/api/users/:id/block` | Block/unblock a user |
| POST | `/api/users/:id/report` | Report a user |
| GET | `/api/posts` | List recent posts; optional `?hashtag=...` filter |
| GET | `/api/posts/:id` | Read a post |
| GET | `/api/posts/saved` | List saved posts |
| POST | `/api/posts/upload` | Upload up to six images |
| POST | `/api/posts` | Create a text/image post |
| POST | `/api/posts/:id/save` | Save/unsave a post |
| POST | `/api/posts/:id/repost` | Repost |
| POST | `/api/posts/:id/comments` | Add a comment |
| POST | `/api/posts/:postId/comments/:commentId/replies` | Reply to a comment |
| POST | `/api/posts/:id/like` | Like/unlike a post |
| DELETE | `/api/posts/:id` | Delete own post; admin/manager may delete others |
| GET | `/api/notifications` | List notifications and unread count |
| POST | `/api/notifications/read` | Mark notifications as read |
| GET | `/api/messages/conversations` | List conversations |
| POST | `/api/messages/conversations` | Find or create a one-to-one conversation |
| GET | `/api/messages/conversations/:id/messages` | Read conversation messages |
| POST | `/api/messages/conversations/:id/messages` | Send a message |
| POST | `/api/messages/conversations/:id/read` | Mark received messages as read |
| GET | `/api/admin/stats` | Admin counts for users, posts, and reports |
| PATCH | `/api/admin/reports/:id` | Update a report status |
| DELETE | `/api/admin/posts/:id` | Admin-delete a post |
| PATCH | `/api/admin/users/:id/block` | Admin-moderate a user account |

Admin routes require an authenticated account whose database role is `admin`. The report listing endpoint is currently `GET /api/users/admin/reports` and also checks the user's admin role.

### Registration example

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Example User",
  "email": "user@example.com",
  "password": "use-a-strong-password"
}
```

Registration currently requires name, email, and a password of at least six characters. New registrations are assigned the `employee` role by the API. Use a stronger password policy before a public production launch.

### Login example

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

The response includes a JWT that expires after seven days. Send it in the `Authorization: Bearer ...` header on protected API requests.

## Real-time events

Socket.IO authenticates the connection using the JWT supplied in the handshake's `auth.token` field. Current event names include:

- Server → client: `realtime:ready`, `presence:list`, `presence:online`, `presence:offline`, `presence:pong`, `notification:new`, `message:new`
- Client → server: `presence:heartbeat`, `typing:start`, `typing:stop`, `conversation:join`, `conversation:leave`

Typing events are broadcast to sockets in the requested conversation room. Clients should join only conversations the logged-in user is allowed to access.

## Image uploads

The upload route accepts the multipart field `images`, up to six files, each limited to 2 MB. Allowed MIME types are JPEG, PNG, WEBP, and GIF. Configure all three Cloudinary variables to use Cloudinary storage. Without those variables, the API currently returns base64 data URLs; this fallback is suitable only for limited testing and is not recommended for production-scale storage.

## Deploy to Render

1. Push the repository to GitHub.
2. In Render, create a new **Blueprint** and select this repository, or create a Node web service with `server` as its root directory.
3. Use `server/render.yaml` as the deployment configuration. It sets the root directory, install/build command, start command, and health-check path.
4. Add `MONGODB_URI` as a secret environment variable in Render. Keep the generated `JWT_SECRET` private.
5. Set `FRONTEND_URL` to the exact GitHub Pages origin, including the scheme, e.g. `https://devops-saurabhpandey.github.io`. Do not include the repository path in an origin.
6. After deployment, test `https://YOUR-RENDER-SERVICE.onrender.com/api/health`. Confirm the JSON reports `"database": "connected"`.
7. In GitHub repository **Settings → Secrets and variables → Actions → Variables**, set `VITE_API_URL` to the Render API base URL (no trailing slash), e.g. `https://YOUR-RENDER-SERVICE.onrender.com`. Then rerun the Pages deployment workflow or push a frontend change so the frontend is rebuilt with that value.

The frontend and API are deployed separately. A successful GitHub Pages build does not prove that the API is deployed or that MongoDB is connected.

## Important implementation notes

- The server currently mounts auth, users, posts, notifications, messages, and admin route modules.
- `server/routes/rto.js` and `server/routes/tasks.js` exist in the repository but are **not currently mounted** in `server/index.js`. Their endpoints will not respond until the routes are mounted and the frontend/API integration is implemented.
- Configure a production-grade password policy, request validation, rate limiting, logging, backups, and monitoring before opening registration to the public.
- Review CORS origins and role assignment carefully before a public launch. Never put MongoDB credentials, Cloudinary secrets, or JWT secrets in frontend code.
