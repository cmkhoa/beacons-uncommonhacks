import "dotenv/config";
import cors from "cors";
import express from "express";
import analyticsRouter from "./routes/analytics.js";
import healthRouter from "./routes/healthRoutes.js";
import hospitalsRouter from "./routes/hospitals.js";
import itemsRouter from "./routes/items.js";
import requestsRouter from "./routes/requests.js";
import usersRouter from "./routes/users.js";
import voiceRouter from "./routes/voice.js";
import { scanAndCreateShortageRequests } from "./services/transferService.js";
const app = express();
const PORT = Number(process.env.PORT) || 5050;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/hospitals", hospitalsRouter);
app.use("/api/items", itemsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/voice", voiceRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/users", usersRouter);

app.listen(PORT, () => {
  console.log(`[Beacon] API listening on http://localhost:${PORT}`);
  scanAndCreateShortageRequests()
    .then((n) => console.log(`[Beacon] Startup scan: ${n} shortage request(s) created`))
    .catch((err) => console.error("[Beacon] Startup scan failed:", err));
});
