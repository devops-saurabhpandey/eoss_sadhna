# SHIVASHA Frontend Documentation

**Product:** SHIVASHA Social Community Platform  
**Repository:** `devops-saurabhpandey/ktl_rto`  
**Live frontend:** https://devops-saurabhpandey.github.io/ktl_rto/  
**Frontend stack:** React 19, Vite 7, JavaScript, CSS, Socket.IO Client

> This document describes the frontend currently present in the repository. A successful GitHub Pages deployment publishes the UI, but user accounts, posts, messages, and other API-backed features require the backend and MongoDB to be configured and reachable.

## हिंदी में संक्षेप

यह दस्तावेज़ SHIVASHA के React frontend की संरचना, सुविधाएँ, local development, build/deployment और backend connection को समझाता है। केवल frontend deploy होने से database या backend अपने-आप चालू नहीं होते।

## 1. Frontend Overview

The frontend is a responsive single-page application (SPA). Vite builds the React application into the `dist/` directory, and GitHub Pages hosts that static output under the `/ktl_rto/` path.

### Main technologies

| Technology | Purpose |
|---|---|
| React 19 | UI components and application state |
| Vite 7 | Local development server and production build |
| CSS | Layout, theme, and responsive styles |
| Socket.IO Client | Real-time connection for messaging, typing and presence |
| Fetch API | HTTP requests to the backend REST API |
| Browser localStorage | Persists the current SHIVASHA authentication response |

## 2. Frontend Features

The code includes the following UI and client-side workflows. Their successful operation depends on the corresponding backend endpoints and configuration.

- **Authentication UI:** login and account registration; password input requires at least six characters in the browser.
- **Feed:** load posts, create text/image-reference posts, like, comment, reply, repost, open post details, and delete posts where permitted.
- **Profiles and connections:** current user profile, public profiles, user discovery, follow/unfollow actions and connection lists.
- **Search and hashtags:** search users and open hashtag-filtered posts.
- **Saved posts:** save or unsave posts and view saved posts.
- **Notifications:** display notifications and mark them as read.
- **Messaging:** conversations, message history, send messages, unread state, typing indicators and online presence using Socket.IO.
- **Safety/moderation UI:** block/report flows and an admin moderation screen for reviewing reports.
- **Responsive layout:** desktop sidebar and mobile navigation/layout rules.

## 3. Project Structure

Key frontend files:

```text
.
├── index.html
├── package.json
├── vite.config.js
├── .github/
│   └── workflows/
│       └── deploy.yml
├── src/
│   ├── App.jsx
│   ├── index.css
│   ├── AdminDashboard.jsx
│   └── AdminReportActions.jsx
└── server/
    ├── index.js
    ├── routes/
    └── ...
```

- `src/App.jsx`: main React app, authentication screen, feed and social interactions, API calls and Socket.IO client.
- `src/index.css`: global styles, components, and responsive breakpoints.
- `src/AdminDashboard.jsx`: moderation report UI.
- `src/AdminReportActions.jsx`: actions for handling moderation reports.
- `vite.config.js`: Vite configuration, including the GitHub Pages base path.
- `server/`: backend application; documented separately from the frontend.

## 4. Run the Frontend Locally

Prerequisites: Node.js and npm installed.

1. Clone the repository:
   ```bash
   git clone https://github.com/devops-saurabhpandey/ktl_rto.git
   cd ktl_rto
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Configure the API URL as described in the next section. For local backend development, the default API URL is `http://localhost:5000`.
4. Start Vite:
   ```bash
   npm run dev
   ```
5. Open the local URL printed by Vite in the terminal (usually `http://localhost:5173`).

## 5. Backend URL Configuration

The frontend reads the API base URL from:

```js
import.meta.env.VITE_API_URL || "http://localhost:5000"
```

For GitHub Pages deployment, configure a **GitHub Actions repository variable**:

- Name: `VITE_API_URL`
- Value: the public HTTPS base URL of the deployed backend, for example `https://your-service.onrender.com` (example only; use your actual service URL).
- Do not add a trailing slash.

The workflow injects this variable at build time. After changing it, run a new deployment/build so the compiled frontend receives the new value.

The backend also needs environment variables on its hosting service:

- `MONGODB_URI`: MongoDB Atlas connection string.
- `JWT_SECRET`: long, random, private signing secret.
- `FRONTEND_URL`: `https://devops-saurabhpandey.github.io/ktl_rto`

Never put database credentials or `JWT_SECRET` in frontend code, Vite variables, or public repository files. Only the public API base URL belongs in `VITE_API_URL`.

## 6. Build and Preview

Create a production build:

```bash
npm run build
```

Vite outputs the static production site to `dist/`.

Preview the production build locally:

```bash
npm run preview
```

A successful build confirms that Vite can compile the frontend. It does **not** confirm that the backend, database, authentication, or live messaging are operational.

## 7. GitHub Pages Deployment

The workflow at `.github/workflows/deploy.yml` runs when commits are pushed to `main` and can also be manually started from GitHub Actions.

Current deployment settings:

- Build command: `npm run build`
- Published directory: `dist/`
- Vite base path: `/ktl_rto/`
- Hosting URL: https://devops-saurabhpandey.github.io/ktl_rto/

To verify a deployment, open the repository's **Actions** tab and check that both the **build** and **deploy** jobs completed successfully.

## 8. API and Real-Time Integration

The frontend calls backend routes under `/api`. Current integration includes these route groups:

| Route group | Frontend use |
|---|---|
| `/api/auth` | Register and login |
| `/api/users` | Current profile, discovery, search, follow, profiles and moderation reports |
| `/api/posts` | Feed, post creation, likes, comments, replies, reposts, saved posts and hashtags |
| `/api/notifications` | Load notifications and mark them as read |
| `/api/messages` | Conversations, message history, sending and read state |
| Socket.IO | Real-time message events, presence and typing events |

The backend is the source of truth for authorization and stored data. Frontend visibility alone is not a security boundary; all privileged operations must be validated by the backend.

## 9. Troubleshooting

### The old page or old branding appears
- Confirm the latest GitHub Actions deployment succeeded.
- Open the exact live URL above in a new tab.
- Hard-refresh or clear the browser cache if necessary.
- Confirm that the latest commit is on `main`.

### Login/Register fails or the app reports a network error
- Confirm that the backend service is running.
- Open `https://YOUR-BACKEND-URL/api/health` with your actual backend hostname.
- Confirm `VITE_API_URL` is set to the correct HTTPS backend URL and rebuild/redeploy.
- Confirm backend `FRONTEND_URL` exactly matches the GitHub Pages origin.
- Check Render logs and browser developer-console/network errors.

### The page loads but data does not
A frontend deployment can succeed even when the API is offline or MongoDB is disconnected. Check the health endpoint and backend logs. The health response should report the service as `SHIVASHA API`; ideally the database status should be `connected`.

### Socket.IO shows offline
Check that the API URL points to the deployed backend, the backend is running, the authentication token is valid, and the host allows Socket.IO/WebSocket connections.

## 10. Known Implementation Notes

- The frontend currently falls back to `http://localhost:5000` when `VITE_API_URL` is missing. That fallback is intended for local development; a deployed frontend needs the real API URL.
- Authentication data is stored in browser `localStorage`. Treat shared/public devices accordingly.
- Image display/upload behavior depends on the relevant backend and storage configuration.
- No automated frontend test suite is documented in the current `package.json`; `npm run build` is the available production compilation check.
- Do not describe the app as fully production-ready solely because GitHub Pages deployment succeeds. Verify API, database, authentication, uploads, messaging and access controls separately.

## 11. Useful Links

- [Live SHIVASHA frontend](https://devops-saurabhpandey.github.io/ktl_rto/)
- [GitHub repository](https://github.com/devops-saurabhpandey/ktl_rto)
- [GitHub Actions deployments](https://github.com/devops-saurabhpandey/ktl_rto/actions)
- [MongoDB Atlas](https://cloud.mongodb.com/)
- [Render Dashboard](https://dashboard.render.com/)
