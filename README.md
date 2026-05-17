# Beacon

Beacon is an emergency supply optimizer for hospitals. Nurses can log inventory changes from a focused form or an ElevenLabs voice assistant, while the visualization tools show hospital inventory, transfer routes, volunteer supply requests, and regional analytics.

## Tech Stack

- Backend: Express, TypeScript, Firebase Admin SDK, Firestore
- Frontend: React, Vite, Tailwind CSS
- Maps: Mapbox via `react-map-gl`
- Voice: ElevenLabs Conversational AI widget
- Data: Firestore collections for hospitals, inventory, items, users, requests, and logs

## Project Structure

```text
backend/
  server.ts                 Express app and API route registration
  routes/                   HTTP endpoints
  services/                 Firestore and business logic
  models/                   Shared backend types
  scripts/                  Firestore seed scripts

frontend/
  src/components/           App screens and shared UI
  src/lib/                  API and session helpers
  src/index.css             Global theme and font setup

docs/
  ELEVENLABS_SETUP.md       ElevenLabs tool and webhook setup
```

## Prerequisites

- Node.js and npm
- Firebase project with Firestore in Native mode
- Firebase Admin service account credentials
- Mapbox token for the visualizer map
- ElevenLabs Conversational AI agent for voice updates
- `ngrok` if testing ElevenLabs webhooks locally

## Environment Setup

Create backend and frontend env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Backend values:

```bash
PORT=5050
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
VOICE_WEBHOOK_SECRET=replace-with-a-random-secret
```

Frontend values:

```bash
VITE_API_BASE=http://localhost:5050
VITE_MAPBOX_TOKEN=your-mapbox-token
VITE_ELEVENLABS_AGENT_ID=your-elevenlabs-agent-id
```

The Firebase web app values in `frontend/.env` are only needed for frontend Firebase features. The main app data currently flows through the backend API.

## Install Dependencies

From the repo root:

```bash
npm --prefix backend install
npm --prefix frontend install
```

## Seed Firestore

Run the seed scripts from `backend/` after `backend/.env` is configured:

```bash
cd backend
npx tsx scripts/seed-hospitals.ts
npx tsx scripts/seed-users.ts
```

`seed-hospitals.ts` creates global items, five Chicago-area hospitals, and hospital inventory entries. `seed-users.ts` creates one nurse per seeded hospital.

## Run Locally

Start the backend API:

```bash
npm --prefix backend run dev
```

The API listens on:

```text
http://localhost:5050
```

Start the frontend:

```bash
npm --prefix frontend run dev
```

Open the Vite URL printed in the terminal, usually:

```text
http://localhost:5173
```

## ElevenLabs Local Webhooks

Start an ngrok tunnel to the backend:

```bash
ngrok http 5050
```

Use the HTTPS ngrok URL for ElevenLabs tools:

```text
POST https://your-ngrok-domain/api/voice/webhooks/action
POST https://your-ngrok-domain/api/voice/webhooks/get
```

Every ElevenLabs webhook tool must send:

```text
x-beacon-secret: <VOICE_WEBHOOK_SECRET>
```

Preferred voice update tool:

```json
{
  "hospitalId": "{{hospitalId}}",
  "nurseId": "{{nurseId}}",
  "entryId": "inventory entry id from inventoryList",
  "action": "used",
  "quantity": 5
}
```

Action behavior:

- `used`: decreases `availableCount` only
- `removed`: decreases both `count` and `availableCount`
- `added`: increases both `count` and `availableCount`

See `docs/ELEVENLABS_SETUP.md` for the full agent prompt, dynamic variables, and tool schemas.

## Core Workflows

### Nurse Inventory Updates

1. Nurse signs in by selecting a hospital and nurse profile.
2. Nurse selects an item category and item.
3. Nurse chooses an action:
   - `Used`: available stock decreases, total stock stays the same.
   - `Removed`: available stock and total stock both decrease.
   - `Added`: available stock and total stock both increase.
4. Backend validates nurse access, updates Firestore, recalculates status, and writes an inventory log.
5. If the item drops below threshold, the backend can create an automatic transfer request.

### Voice Updates

1. Frontend passes `hospitalId`, `nurseId`, and `inventoryList` to the ElevenLabs widget.
2. ElevenLabs maps spoken item names to `entryId` from `inventoryList`.
3. ElevenLabs calls `/api/voice/webhooks/action` for inventory changes or `/api/voice/webhooks/get` for stock questions.
4. Backend applies the same inventory rules as the nurse form and logs the change to Firestore.

### Transfer Visualization

1. The visualization map loads hydrated hospitals and active transfer requests.
2. Hospital pins reflect current inventory-derived status.
3. Active transfers draw routes between hospitals using Mapbox Directions.
4. The mission panel shows transfer and shortage suggestions in a compact list.

### Volunteer Supply

1. Requests are listed in a flat table.
2. Admin or visualization users can assign donors and progress requests.
3. Nurses can volunteer their own hospital for unassigned requests when appropriate.

### Regional Analytics

1. The analytics view loads summary, hospitals, inventory, and requests.
2. It calculates network health, at-risk nodes, active transfers, and category health.
3. The facility table lists area, score, and status for each hospital.

## API Overview

Common local endpoints:

```text
GET   /api/health
GET   /api/hospitals
GET   /api/hospitals?hydrate=true
GET   /api/hospitals/:hospitalId
PATCH /api/hospitals/:hospitalId/inventory/:entryId
GET   /api/items
GET   /api/users
GET   /api/requests
POST  /api/requests
POST  /api/voice/webhooks/action
POST  /api/voice/webhooks/get
```

Inventory PATCH supports:

```json
{
  "change": -5,
  "adjustmentType": "available",
  "nurseId": "nurse-user-id",
  "source": "MANUAL_FORM",
  "message": "Used 5 isolation gowns"
}
```

`adjustmentType` can be:

- `available`: update `availableCount` only
- `stock`: update both `count` and `availableCount`

## Build and Checks

Backend typecheck:

```bash
npm --prefix backend run build
```

Frontend production build:

```bash
npm --prefix frontend run build
```

Frontend lint:

```bash
npm --prefix frontend run lint
```

## Demo Flow

1. Seed hospitals and users.
2. Start backend and frontend.
3. Sign in as a nurse.
4. Submit a `used`, `removed`, or `added` inventory update.
5. Open the visualization tool from the user menu.
6. Review transfer routes, volunteer supply requests, inventory, and regional analytics.
7. Optionally connect ElevenLabs through ngrok and test hands-free updates.

Built for Uncommon Hacks.
