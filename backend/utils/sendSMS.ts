import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client =
  accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Sends an emergency SMS via Twilio. Logs success/failure to the terminal.
 */
export async function sendEmergencyAlert(
  toPhoneNumber: string,
  messageBody: string
): Promise<{ sid: string } | null> {
  if (!client || !fromNumber) {
    console.log(
      "[Twilio] Skipped — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env"
    );
    return null;
  }

  try {
    console.log(`[Twilio] Sending alert to ${toPhoneNumber}...`);
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: toPhoneNumber,
    });
    console.log(`[Twilio] Sent successfully. SID: ${message.sid}`);
    return { sid: message.sid };
  } catch (error) {
    console.error("[Twilio] Failed to send SMS:", error);
    return null;
  }
}
