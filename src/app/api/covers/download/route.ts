import { NextRequest } from "next/server";
import { downloadAll, type DownloadProgress } from "@/lib/img-downloader";

export async function POST(req: NextRequest) {
  const { urls } = await req.json();
  if (!Array.isArray(urls)) {
    return new Response(JSON.stringify({ error: "urls array required" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: DownloadProgress) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await downloadAll(urls, send);
      } catch (e: any) {
        send({ total: 0, completed: 0, current: "", status: "error", error: e.message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
