import { verifyDiscordRequest } from "@/lib/discord/verify";
import { handleInteraction } from "@/lib/discord/commands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");

  if (!verifyDiscordRequest(rawBody, signature, timestamp)) {
    return new Response("invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(rawBody) as Parameters<typeof handleInteraction>[0];
  return handleInteraction(interaction);
}
