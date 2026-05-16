import "dotenv/config";
import cors from "cors";
import express from "express";
import analyticsRouter from "./routes/analytics.js";
import healthRouter from "./routes/healthRoutes.js";
import hospitalsRouter from "./routes/hospitals.js";
import itemsRouter from "./routes/items.js";
import voiceRouter from "./routes/voice.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/hospitals", hospitalsRouter);
app.use("/api/items", itemsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/voice", voiceRouter);

app.listen(PORT, () => {
  console.log(`[Beacon] API listening on http://localhost:${PORT}`);
});
