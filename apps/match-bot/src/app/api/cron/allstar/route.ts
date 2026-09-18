import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/auth/cron";
import { videoNotificationService } from "@/lib/services/VideoNotificationService";
import { apiError, apiOk } from "@/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Invalid cron secret"), { status: 401 });
  }
  try {
    const data = await videoNotificationService.discoverAndNotify({ perPlayerLimit: 8 });
    return NextResponse.json(apiOk(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Allstar cron failed";
    return NextResponse.json(apiError("CRON_FAILED", message), { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
