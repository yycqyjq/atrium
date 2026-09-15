import { NextResponse } from "next/server";
import { getProviderList } from "@/lib/providers";

export const dynamic = "force-dynamic";

/** GET /api/providers：列出内容源与配置状态（不含任何密钥） */
export async function GET() {
  return NextResponse.json({ providers: await getProviderList() });
}
