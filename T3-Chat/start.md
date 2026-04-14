# T3 Chat Start Guide

This is the main setup and deployment reference for this repository.

Read this file in order from top to bottom.

This file has two goals:

1. help you bring `T3 Chat` up locally from a fresh machine
2. tell you exactly what is still missing before `T3 Chat` is truly production-ready

## 0. Read This First

The current repository is close enough to run after setup and code fixes, but it is not in a state where you should blindly fill env vars and deploy.

You should treat this file in three phases:

1. complete local setup
2. run a local smoke test
3. fix the code gaps listed later in this file

Only after all three are done should you think about production deployment.

Use the name `T3 Chat` consistently everywhere:

- application name: `T3 Chat`
- local app name: `T3 Chat`
- production app name: `T3 Chat`
- GitHub OAuth app name: `T3 Chat`
- suggested Docker service names: `t3-chat-app` and `t3-chat-db`

## 1. What This Repository Actually Contains

At the time of writing, this repo contains:

- a Next.js 15 app
- React 19
- Prisma with PostgreSQL
- Better Auth
- GitHub social login
- OpenRouter-based chat model access
- a Docker Compose file for PostgreSQL only

What this repo does not contain yet:

- a checked-in `.env.example`
- a full app `Dockerfile`
- an app container in `docker-compose.yml`
- automated production migration execution
- some important runtime hardening and guard logic

Short version:

- yes, this app can be made to run
- no, the current repo should not be considered production-ready without fixes

## 2. Current State Summary

Before you do anything else, understand the current state clearly:

- local setup is possible
- the database service already has a Compose file
- authentication is wired to GitHub
- Prisma migrations already exist
- chat model loading depends on OpenRouter
- some code paths still need fixing before safe deployment

The most important practical consequence is this:

- if you complete the setup steps below, you should be able to attempt a local smoke test
- but you should still fix the code issues in `## 19` before treating the app as deployable

## 3. Prerequisites

Install all of these first:

- Node.js `20.9+`
- npm
- Docker Desktop
- Git

Recommended:

- Node.js `20 LTS`
- a terminal that can run PowerShell commands cleanly
- a GitHub account
- an OpenRouter account

Verify your toolchain:

```bash
node -v
npm -v
docker -v
docker compose version
git --version
```

Do not continue until these commands work.

## 4. Accounts, Keys, and External Services You Need

To run `T3 Chat` end to end, you still need to create or collect:

- one PostgreSQL database
- one OpenRouter API key
- one GitHub OAuth App
- one Better Auth secret

You can think of the setup in this way:

- PostgreSQL stores users, sessions, chats, and messages
- GitHub OAuth lets users sign in
- Better Auth manages sessions and auth flow
- OpenRouter powers the AI model list and chat completions

## 5. Fresh Machine Setup Flow

If you are starting from zero, follow this exact order:

1. install Node.js
2. install Docker Desktop
3. install Git
4. clone the repo
5. install npm dependencies
6. create `.env`
7. start PostgreSQL
8. run Prisma migrations
9. configure GitHub OAuth
10. configure OpenRouter
11. start the app
12. sign in and smoke test
13. fix the code gaps listed later
14. only then prepare production deployment

## 6. Clone the Repository

From a fresh machine:

```bash
git clone <your-repo-url>
cd t3-chat
```

If this repo is private, make sure your Git credentials are already working before continuing.

## 7. Install Dependencies

Run:

```bash
npm install
```

Why this matters:

- it installs all Next.js, React, Prisma, auth, and UI dependencies
- this repo also runs `prisma generate` during `postinstall`

What success looks like:

- `node_modules` exists
- there is no `next not recognized` error when you later run scripts

Do not continue if `npm install` fails.

Common reasons for failure:

- unstable internet
- npm registry access problems
- proxy misconfiguration
- partial install from an interrupted previous run

## 8. Create the Local Environment File

Create a file named `.env` in the root of the repo.

Use `.env` for local work because Prisma reads from it directly.

Use this exact local template:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5430/postgres?schema=public"

OPENROUTER_API_KEY="your_openrouter_api_key"

GITHUB_CLIENT_ID="your_github_oauth_client_id"
GITHUB_CLIENT_SECRET="your_github_oauth_client_secret"

BETTER_AUTH_SECRET="replace_with_a_random_secret_at_least_32_chars_long"
BETTER_AUTH_URL="http://localhost:3000"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 8.1 Environment variable explanation

| Variable | Required locally | Required in production | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | yes | PostgreSQL connection used by Prisma and auth-related database access |
| `OPENROUTER_API_KEY` | yes | yes | used by model listing and chat generation |
| `GITHUB_CLIENT_ID` | yes | yes | GitHub OAuth login |
| `GITHUB_CLIENT_SECRET` | yes | yes | GitHub OAuth login |
| `BETTER_AUTH_SECRET` | yes | yes | auth secret for Better Auth; do not leave this unset |
| `BETTER_AUTH_URL` | recommended locally, yes in production | yes | canonical auth base URL |
| `NEXT_PUBLIC_APP_URL` | optional locally but keep set for consistency, yes in production | yes | used by the client-side auth configuration in production mode |

### 8.2 Important notes about these variables

`DATABASE_URL`

- local port must match the Docker Compose file, which is `5430`
- do not change the port unless you also change your local database service

`OPENROUTER_API_KEY`

- without this, the app cannot fetch models
- without models, the chat flow is effectively blocked

`GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`

- without these, the sign-in page cannot complete login
- because the app depends on authenticated user sessions, this is not optional for the normal flow

`BETTER_AUTH_SECRET`

- set this both locally and in production
- use a long, random value
- never commit this value to the repo

`BETTER_AUTH_URL`

- local value should be `http://localhost:3000`
- production value must be your real HTTPS domain

`NEXT_PUBLIC_APP_URL`

- local value should also be `http://localhost:3000`
- production value must be your real HTTPS domain

### 8.3 Generate a Better Auth secret

If `openssl` is available:

```bash
openssl rand -base64 32
```

If `openssl` is not available, generate a long random string another way. Keep it private.

## 9. Start PostgreSQL Locally

This repo already ships a Docker Compose file for PostgreSQL.

Start the database:

```bash
docker compose up -d
```

Current local database settings from the repo:

- host: `localhost`
- port: `5430`
- database: `postgres`
- username: `postgres`
- password: `postgres`

Verify the container is up:

```bash
docker compose ps
```

Stop the database later if needed:

```bash
docker compose down
```

Important:

- the current `docker-compose.yml` only runs the database
- it does not run the Next.js app
- this is enough for local development, but not a full production container setup

## 10. Run Prisma Migrations

After the database is running and `.env` is present, apply the existing migrations:

```bash
npx prisma migrate deploy
```

Optional useful commands:

```bash
npx prisma generate
npx prisma studio
```

Use these rules:

- use `npx prisma migrate deploy` when applying existing committed migrations
- use `npx prisma migrate dev` only when you are changing the Prisma schema yourself

What success looks like:

- migration command completes without database connection errors
- the auth tables, chat tables, and message tables exist

Do not continue if migrations fail.

## 11. Configure GitHub OAuth

`T3 Chat` currently uses GitHub as the sign-in provider.

Create a GitHub OAuth App and configure it with:

- application name: `T3 Chat`
- local homepage URL: `http://localhost:3000`
- local callback URL: `http://localhost:3000/api/auth/callback/github`

When you later prepare production, add:

- production homepage URL: `https://your-domain.com`
- production callback URL: `https://your-domain.com/api/auth/callback/github`

After creating the OAuth App, copy the credentials into:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Important:

- the callback URL must match exactly
- if it is wrong, sign-in will fail even if the credentials are correct

## 12. Configure OpenRouter

Create an OpenRouter API key and place it in:

- `OPENROUTER_API_KEY`

This app currently uses OpenRouter in two places:

- model list fetching
- chat completion requests

What this means in practice:

- if OpenRouter is misconfigured, the model selector may fail
- if no model is available, chat creation and generation can fail

If OpenRouter-related behavior fails, check:

- the key is real
- the key is active
- the key is not rate-limited or disabled
- your OpenRouter account has the required model access

## 13. Start T3 Chat Locally

Once dependencies, env vars, database, and migrations are ready, start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/sign-in
```

Why start at `/sign-in`:

- the sign-in page is already wired for GitHub OAuth
- most of the app expects an authenticated user session
- the root app layout redirects unauthenticated users to `/sign-in`

Important:

- a successful boot only proves the app can start
- it does not prove the repo is secure or production-ready
- you still need to fix the code issues listed in `## 19`

## 14. Local Smoke Test Checklist

After starting the app, verify all of the following:

1. the app opens at `http://localhost:3000`
2. visiting `/sign-in` renders the sign-in page
3. clicking GitHub sign-in redirects correctly
4. login returns you to the app
5. the model list loads
6. you can create a chat
7. you can open the created chat
8. a response is generated
9. the created chat persists after refresh
10. logout works

If any of those fail, do not assume it is only an env issue. Check the code gaps in `## 19`.

## 15. Exact Local Bring-Up Order

Use this exact order every time you set up a fresh machine:

1. `git clone <your-repo-url>`
2. `cd t3-chat`
3. `npm install`
4. create `.env`
5. `docker compose up -d`
6. `npx prisma migrate deploy`
7. configure GitHub OAuth callback URLs
8. configure `OPENROUTER_API_KEY`
9. `npm run dev`
10. open `http://localhost:3000/sign-in`
11. sign in with GitHub
12. run the smoke test checklist

## 16. Production Environment Variables

When you eventually deploy, set all of these in the hosting platform:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
OPENROUTER_API_KEY="your_production_openrouter_key"
GITHUB_CLIENT_ID="your_production_github_client_id"
GITHUB_CLIENT_SECRET="your_production_github_client_secret"
BETTER_AUTH_SECRET="your_production_better_auth_secret"
BETTER_AUTH_URL="https://your-domain.com"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

If you run multiple app instances behind a load balancer, also consider setting:

```env
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="your_shared_base64_key"
```

Why:

- this app uses Next.js server actions
- shared encryption keys matter when more than one instance serves requests

## 17. Production Database Rule

Do not use the local Docker PostgreSQL container as your real production database.

Use a real PostgreSQL provider instead, for example:

- Neon
- Supabase
- Railway
- Render PostgreSQL
- your own managed PostgreSQL server

Then replace `DATABASE_URL` with the real production connection string.

## 18. Deployment Options

There are two realistic deployment directions for `T3 Chat`.

### 18.1 Path A: Next.js-friendly platform

Best for simplicity:

- deploy the app to a Next.js-friendly host
- use managed PostgreSQL
- inject production env vars in the platform dashboard
- run Prisma migrations during deploy

Good fit:

- Vercel for the app
- Neon or Supabase for PostgreSQL

Recommended production commands:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start
```

Important:

- this repo does not currently automate production migrations
- you must add `npx prisma migrate deploy` to CI, a deploy hook, or your release process
- do not deploy publicly until the code gaps in `## 19` are fixed

### 18.2 Path B: Docker-based deployment

Current status:

- Docker is only partially prepared
- the repo has a PostgreSQL Compose file only
- there is no real app container build defined yet

If you want Docker deployment, you still need to add:

- a `Dockerfile`
- an app service definition
- production env injection for the app container
- a migration step before app startup
- optional reverse proxy configuration

Example `Dockerfile` you can add later:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["npm", "run", "start"]
```

Recommended order for Docker production boot:

1. inject production env vars
2. ensure the production database is reachable
3. run `npx prisma migrate deploy`
4. start the app container
5. place nginx or another reverse proxy in front if needed

Important:

- do not use this deployment path yet unless you first fix the code gaps in `## 19`

## 19. Known Code Gaps Still To Fix

Even if you complete every setup step in this file, this repository still has code-level gaps that should be fixed before you call it reliably runnable for public use or safely deployable.

### 19.1 Security gap in `/api/chat`

Current problem:

- `/api/chat` does not currently verify session ownership before reading or writing messages

Why it matters:

- a caller with a valid or guessed `chatId` may be able to access or affect another chat

What to fix:

- require an authenticated session in the route
- verify the `chatId` belongs to the current user before loading history
- verify writes are only allowed for the current user's chat

### 19.2 Wrong Prisma lookup shape in chat actions

Current problem:

- chat loading and delete checks use `findUnique` with both `id` and `userId`
- in the current Prisma schema, only `id` is unique

Why it matters:

- those queries are logically wrong for the schema shape
- they should be changed to `findFirst` or the schema should define a matching composite unique key

What to fix:

- update those lookups
- test chat opening and deleting again after the change

### 19.3 Missing safe default model on first chat

Current problem:

- the home page chat form does not safely set a model after the model list finishes loading

Why it matters:

- the first created chat can be saved with `model = undefined`
- later chat generation may fail or behave inconsistently

What to fix:

- set a default model when models first load
- block submit until a valid model exists

### 19.4 Model selector assumes external data is always valid

Current problem:

- the model selector assumes `models` is always a valid array

Why it matters:

- if OpenRouter fails, times out, or returns an unexpected payload, the UI can crash instead of showing a graceful fallback

What to fix:

- guard `models` before calling array methods
- render an empty or error state when model data is unavailable

### 19.5 Welcome screen assumes the user always has a name

Current problem:

- the welcome screen assumes `userName` always exists and is a normal string

Why it matters:

- if a GitHub account does not provide a display name, that UI can crash

What to fix:

- guard the value
- provide a fallback label such as `there` or `friend`

### 19.6 Recommended fix order

Fix these in this order:

1. secure `/api/chat`
2. fix the Prisma chat lookup logic
3. set a safe default model
4. add model loading guards
5. add username fallbacks

After those are fixed, repeat the full local smoke test.

## 20. Config And Infrastructure Tasks Still Pending

Even after code fixes, you still need to finish these setup and deployment tasks:

- create the root `.env` file for local development
- create the OpenRouter API key
- create the GitHub OAuth App
- generate `BETTER_AUTH_SECRET`
- verify login works at `/sign-in`
- verify Prisma migrations run cleanly
- choose a real production PostgreSQL provider
- add a real app `Dockerfile` if you want containerized deployment
- add migration execution to your deployment pipeline
- set all production env vars in your host
- add a proper `.env.example`

## 21. Definition Of Done For Local Setup

You can say local setup is complete only when all of the following are true:

- `npm install` succeeds
- `docker compose up -d` succeeds
- `npx prisma migrate deploy` succeeds
- `/sign-in` loads
- GitHub sign-in works
- the chat page loads
- models load
- chat generation works
- chats persist in the database
- the app still works after refresh

## 22. Definition Of Done For Deployment Readiness

You can say `T3 Chat` is actually ready to deploy only when all of the following are true:

- local setup is complete
- the code gaps in `## 19` are fixed
- production env vars exist
- a real production database exists
- production migrations are part of deploy flow
- the production callback URL is configured in GitHub OAuth
- build and startup commands are verified
- unauthorized chat access is blocked
- model-loading failure states are handled safely

## 23. Quick Failure Guide

If `T3 Chat` does not start, check these first:

- `next` command not found: run `npm install`
- database connection error: verify Docker is running and `DATABASE_URL` uses port `5430`
- Prisma error: run `npx prisma migrate deploy`
- GitHub login error: verify callback URL and GitHub credentials
- auth error in production: verify `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`
- no models appear: verify `OPENROUTER_API_KEY`
- chat page fails after login: review the code gaps in `## 19`

## 24. Recommended Next Repo Improvements

After the app is stable, the next repo improvements worth adding are:

- `.env.example`
- `Dockerfile`
- `docker-compose.prod.yml`
- CI or CD step for `npx prisma migrate deploy`
- a healthcheck route
- startup validation for required env vars
- better error states around auth and OpenRouter failures

## 25. Final Practical Advice

If your goal is to get `T3 Chat` running with the least confusion, use this mindset:

- first bring it up locally
- then verify auth, models, and chat flow
- then fix the code gaps
- then think about deployment

If your goal is to deploy immediately, you are moving too early.

Bring `T3 Chat` up locally first. Then harden it. Then deploy it.
