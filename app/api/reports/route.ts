import { getReportIndex } from "@/lib/reports";

export async function GET() {
  return Response.json(await getReportIndex(), { headers: { "Cache-Control": "public, max-age=60" } });
}
