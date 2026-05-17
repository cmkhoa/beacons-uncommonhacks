# ElevenLabs Voice Assistant Setup

This guide explains how to connect the Beacon nurse voice assistant to ElevenLabs Conversational AI using the local backend, ngrok, and the current inventory APIs.

## Architecture

The browser starts an ElevenLabs conversation from the nurse view. ElevenLabs receives hospital and inventory context as dynamic variables, then calls the Beacon backend webhook when it needs to read or update inventory.

```
Nurse browser
  -> ElevenLabs Conversational AI agent
  -> ngrok public URL
  -> backend /api/voice/webhooks/update or /api/voice/webhooks/get
  -> inventoryService
  -> Firestore inventory_logs + hospital inventory
```

## Prerequisites

- Backend running on `http://localhost:5050`
- Frontend running with Vite
- Firestore credentials configured in `backend/.env`
- ElevenLabs account with Conversational AI access
- `ngrok` installed and authenticated

## Environment Variables

### Backend `.env`

Add a webhook secret. Use a random value and keep it out of source control.

```bash
PORT=5050
VOICE_WEBHOOK_SECRET=replace-with-a-random-secret
```

The backend voice webhook checks this secret in the `x-beacon-secret` request header.

### Frontend `.env`

Add the ElevenLabs agent ID.

```bash
VITE_API_BASE=http://localhost:5050
VITE_ELEVENLABS_AGENT_ID=your-elevenlabs-agent-id
```

## Local Backend + ngrok

Start the backend:

```bash
cd backend
npm run dev
```

Start ngrok against the backend port:

```bash
ngrok http 5050
```

Copy the HTTPS forwarding URL, for example:

```text
https://abc123.ngrok-free.app
```

The ElevenLabs webhook URLs will be:

```text
https://abc123.ngrok-free.app/api/voice/webhooks/update
https://abc123.ngrok-free.app/api/voice/webhooks/get
```

Every time ngrok restarts, update the ElevenLabs tool webhook URL unless you are using a reserved ngrok domain.

## ElevenLabs Agent Setup

Create or edit a Conversational AI agent in ElevenLabs.

### Agent Settings

- Language: English
- First message: "Hi, this is Beacon. Tell me what inventory changed or ask about current stock."
- Conversation mode: low-latency if available
- Client-side integration: enabled for the frontend SDK

### Dynamic Variables

The frontend should provide these dynamic variables when starting the session:

```json
{
  "hospitalId": "current hospital id",
  "nurseId": "current nurse user id",
  "inventoryList": "human-readable list of items and entry IDs"
}
```

The important tool fields are `hospitalId`, `nurseId`, and `inventoryList`. The agent must use `entryId` values from `inventoryList` when calling inventory tools.

## System Prompt

Use this prompt as the base system prompt for the ElevenLabs agent:

```text
You are Beacon, a concise hospital supply assistant for nurses.

You help nurses update inventory and answer stock questions for one hospital only.

Current nurse:
- nurseId: {{nurseId}}

Current hospital:
- hospitalId: {{hospitalId}}

Available inventory items:
{{inventoryList}}

Rules:
- Only act on the current hospital.
- Never invent entry IDs. Use the exact entryId from the inventory list.
- If the nurse names an item ambiguously, ask a short clarification question.
- When the nurse says items were used, consumed, removed, broken, discarded, or lost, call update_inventory with a negative change.
- When the nurse says items were added, restocked, delivered, received, or returned to stock, call update_inventory with a positive change.
- Always include nurseId when calling update_inventory.
- Keep spoken responses short and professional.
- After updating inventory, summarize the item and new count from the tool response.
- If a tool returns an error, apologize briefly and tell the nurse what information is missing.

Do not discuss implementation details, Firestore, APIs, ngrok, or tool schemas with the nurse.
```

## Tools

Configure these tools in ElevenLabs as webhook/client tools depending on the ElevenLabs UI available to you.

Add this header to every webhook tool:

```text
x-beacon-secret: <VOICE_WEBHOOK_SECRET from backend/.env>
```

### Tool: `update_inventory`

Use this when the nurse says inventory changed.

Webhook URL:

```text
POST {{NGROK_URL}}/api/voice/webhooks/update
```

Request body:

```json
{
  "hospitalId": "{{hospitalId}}",
  "nurseId": "{{nurseId}}",
  "entryId": "inventory entry id from inventoryList",
  "change": -5
}
```

Parameter schema:

```json
{
  "type": "object",
  "properties": {
    "hospitalId": {
      "type": "string",
      "description": "Current hospital id from dynamic variables."
    },
    "nurseId": {
      "type": "string",
      "description": "Current nurse id from dynamic variables."
    },
    "entryId": {
      "type": "string",
      "description": "Inventory entry id for the item being updated."
    },
    "change": {
      "type": "number",
      "description": "Signed quantity change. Negative for used/removed, positive for added/restocked."
    }
  },
  "required": ["hospitalId", "nurseId", "entryId", "change"]
}
```

Expected response:

```json
{
  "result": "Successfully updated N95 Respirators. The new count is 895."
}
```

### Tool: `get_inventory`

Use this when the nurse asks how much stock is available for an item.

Webhook URL:

```text
POST {{NGROK_URL}}/api/voice/webhooks/get
```

Request body:

```json
{
  "hospitalId": "{{hospitalId}}",
  "entryId": "inventory entry id from inventoryList"
}
```

Parameter schema:

```json
{
  "type": "object",
  "properties": {
    "hospitalId": {
      "type": "string",
      "description": "Current hospital id from dynamic variables."
    },
    "entryId": {
      "type": "string",
      "description": "Inventory entry id for the item being queried."
    }
  },
  "required": ["hospitalId", "entryId"]
}
```

Expected response:

```json
{
  "result": "You currently have 900 masks of N95 Respirators. 800 are available for use and the status is surplus."
}
```

## Inventory Context Format

The frontend should pass compact context with item names, units, categories, counts, and entry IDs.

Recommended format:

```text
N95 Respirators — entryId: abc123, count: 900, available: 800, unit: masks, status: SURPLUS
Ventilators — entryId: def456, count: 4, available: 2, unit: units, status: LOW
```

Avoid passing unrelated hospitals. The agent should only see the nurse's current hospital.

## Example User Phrases

The prompt should handle these:

- "We used five ventilators."
- "Remove 20 N95 masks."
- "We received 100 isolation gowns."
- "How many ventilators do we have?"
- "What's our mask count?"

Expected tool behavior:

- "used five ventilators" -> `update_inventory` with `change: -5`
- "received 100 isolation gowns" -> `update_inventory` with `change: 100`
- "how many ventilators" -> `get_inventory`

## Manual Webhook Test

After starting backend and ngrok, test the webhook manually:

```bash
curl -X POST "https://abc123.ngrok-free.app/api/voice/webhooks/get" \
  -H "Content-Type: application/json" \
  -H "x-beacon-secret: replace-with-a-random-secret" \
  -d '{
    "hospitalId": "YOUR_HOSPITAL_ID",
    "entryId": "YOUR_ENTRY_ID"
  }'
```

For an update test:

```bash
curl -X POST "https://abc123.ngrok-free.app/api/voice/webhooks/update" \
  -H "Content-Type: application/json" \
  -H "x-beacon-secret: replace-with-a-random-secret" \
  -d '{
    "hospitalId": "YOUR_HOSPITAL_ID",
    "nurseId": "YOUR_NURSE_ID",
    "entryId": "YOUR_ENTRY_ID",
    "change": -1
  }'
```

## Common Issues

### 401 Unauthorized

The `x-beacon-secret` header in ElevenLabs does not match `VOICE_WEBHOOK_SECRET`.

### ElevenLabs cannot reach webhook

Check:

- Backend is running on port `5050`
- ngrok is forwarding to `5050`
- Tool URL uses HTTPS
- Tool URL ends with `/api/voice/webhooks/update` or `/api/voice/webhooks/get`

### Agent updates the wrong item

The inventory context may be too vague. Include item names and exact `entryId` values. If several items sound similar, instruct the agent to ask a clarification question.

### Agent updates as system instead of nurse

The tool call is missing `nurseId`. The backend attributes `VOICE_COMMAND` updates to the nurse only when `nurseId` is included.

## Future UI Integration

The production nurse view should replace the current demo voice card with a compact ElevenLabs control that:

- Uses the logged-in nurse session for `nurseId`, `nurseName`, `hospitalId`, and `hospitalName`
- Fetches inventory and item catalog before starting the session
- Passes `inventoryList` as dynamic context
- Shows simple states: idle, connecting, listening, speaking
- Avoids large gradients or floating UI that competes with the form
