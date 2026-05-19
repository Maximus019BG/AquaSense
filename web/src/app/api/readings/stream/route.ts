import { NextResponse } from "next/server";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      // last seen timestamp to avoid duplicates
      let lastTs: string | null = null;

      async function fetchLatest() {
        try {
          if (!process.env.DATABASE_URL) {
            // fallback: hit the regular readings endpoint
            const resp = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/readings`);
            if (!resp.ok) return null;
            const json = await resp.json();
            return json?.data ?? null;
          }

          const { db } = await import("~/server/db");
          const { desc } = await import("drizzle-orm");
          const { waterReadingsTable } = await import("~/server/db/schema");

          const result = await db
            .select()
            .from(waterReadingsTable)
            .orderBy(desc(waterReadingsTable.created_at))
            .limit(1);

          return result[0] ?? null;
        } catch (err) {
          return null;
        }
      }

      async function loop() {
        while (!closed) {
          try {
            const latest = await fetchLatest();
            if (latest) {
              const ts = String(latest.created_at ?? latest.timestamp ?? "");
              if (ts && ts !== lastTs) {
                lastTs = ts;
                const payload = JSON.stringify({ success: true, data: latest });
                controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
              }
            }
          } catch (err) {
            // ignore transient errors
          }
          // poll frequency
          await new Promise((res) => setTimeout(res, 1500));
        }
        controller.close();
      }

      // close on cancel
      (controller as any).onclose = () => {
        closed = true;
      };

      loop();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
