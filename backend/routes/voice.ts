import { Router, type Request, type Response } from "express";
import { processInventoryUpdate, getInventoryEntry } from "../services/inventoryService.js";
import { getItemById } from "../services/itemService.js";
import { getHospitalById } from "../services/hospitalService.js";

const router = Router();

// Simple shared secret check
const WEBHOOK_SECRET = process.env.VOICE_WEBHOOK_SECRET || "beacon-fallback-secret";

/**
 * Middleware to verify ElevenLabs webhook secret
 */
const verifySecret = (req: Request, res: Response, next: Function) => {
  const secret = req.headers["x-beacon-secret"];
  if (secret !== WEBHOOK_SECRET) {
    console.warn(`[Voice] Unauthorized tool call attempt from IP: ${req.ip}`);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

/**
 * POST /api/voice/webhook
 * Handlers tool calls from ElevenLabs Conversational AI
 */
router.post("/webhook", verifySecret, async (req: Request, res: Response) => {
  try {
    const { tool_name, parameters } = req.body;
    console.log(`[Voice] Tool called: ${tool_name}`, parameters);

    if (tool_name === "update_inventory") {
      const { entryId, change, hospitalId } = parameters;
      
      const result = await processInventoryUpdate({
        hospitalId,
        entryId,
        change,
        source: "VOICE_COMMAND",
        message: `Voice update: ${change > 0 ? 'Added' : 'Removed'} ${Math.abs(change)} items.`
      });

      const item = await getItemById(result.itemId);
      const itemName = item ? item.name : "the item";

      let responseMessage = `Successfully updated ${itemName}. The new count is ${result.newCount}.`;
      
      if (result.transferRequest) {
        const fromHospital = await getHospitalById(result.transferRequest.fromHospitalId);
        const fromHospitalName = fromHospital ? fromHospital.name : "another facility";
        responseMessage += ` I've also initiated an emergency transfer of supplies from ${fromHospitalName} to cover the shortage.`;
      }

      res.json({ result: responseMessage });
      return;
    }

    if (tool_name === "get_inventory") {
      const { entryId, hospitalId } = parameters;
      
      const entry = await getInventoryEntry(hospitalId, entryId);

      if (!entry) {
        res.json({ result: `I couldn't find that item in the records for this facility.` });
        return;
      }

      const itemDetails = await getItemById(entry.itemId);
      const itemName = itemDetails ? itemDetails.name : "the item";
      const itemUnit = itemDetails ? itemDetails.unit : "units";

      res.json({ 
        result: `You currently have ${entry.count} ${itemUnit} of ${itemName}. ${entry.availableCount} are available for use and the status is ${entry.status.toLowerCase().replace('_', ' ')}.` 
      });
      return;
    }

    res.status(400).json({ error: "Unknown tool" });
  } catch (error: any) {
    console.error("[Voice Webhook Error]", error);
    res.status(200).json({ result: `Sorry, I encountered an error: ${error.message}` });
  }
});

export default router;
