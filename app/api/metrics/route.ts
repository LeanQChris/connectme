import { computeMetrics } from "@/lib/store";
import { requireUserId } from "@/lib/tenant";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;
  return Response.json(await computeMetrics(auth.userId));
}
