import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/auth/cron";
import { isDashboardAuthed } from "@/lib/auth/dashboard";
import { universalSyncService } from "@/lib/services/UniversalSyncService";
import { apiError, apiOk } from "@/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const cronOk = authorizeCron(req);
  const dashOk = await isDashboardAuthed();
  if (!cronOk && !dashOk) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }
  try {
    const data = await universalSyncService.run();
    return NextResponse.json(apiOk(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json(apiError("SYNC_FAILED", message), { status: 500 });
  }
}
