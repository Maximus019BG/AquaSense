import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const FALLBACK_CSV_PATH = path.resolve(process.cwd(), "..", "docs", "data", "processed", "burgas_final.csv");

async function getFallbackReadings(limit = 1) {
  const csv = await readFile(FALLBACK_CSV_PATH, "utf-8");
  const lines = csv.trim().split(/\r?\n/);

  if (lines.length < 2) {
    throw new Error("No fallback readings available");
  }

  const headers = lines[0]?.split(",") ?? [];
  if (headers.length === 0) {
    throw new Error("No fallback readings available");
  }
  const dataLines = lines.slice(1);

  // take last `limit` lines
  const chosen = dataLines.slice(-limit);

  const out = chosen.map((ln) => {
    const values = ln.split(",");
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return {
      temperature: Number(row.temperature_C),
      ph: Number(row.ph),
      turbidity: Number(row.turbidity_kd),
      dissolvedOxygen: Number(row.dissolved_o2),
      waterLevel: Number(row.sea_level_m),
      salinity: Number(row.salinity_psu),
      currentSpeed: Number(row.current_speed_m_s),
      timestamp: row.time,
      source: "fallback_csv",
    };
  });

  return out;
}

async function getFallbackReading() {
  const arr = await getFallbackReadings(1);
  return { success: true, data: arr[0] };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Basic validation/coercion
    const temperature = body.temperature !== undefined ? Number(body.temperature) : null;
    const ph = body.ph !== undefined ? Number(body.ph) : null;
    const turbidity = body.turbidity !== undefined ? Number(body.turbidity) : null;
    const dissolvedOxygen = body.dissolvedOxygen ?? body.dissolved_oxygen ?? null;
    const waterLevel = body.waterLevel ?? body.water_level ?? null;
    const sensorId =
      typeof body.sensor_id === "string"
        ? body.sensor_id
        : typeof body.sensorId === "string"
          ? body.sensorId
          : null;

    if (
      temperature === null &&
      ph === null &&
      turbidity === null &&
      dissolvedOxygen === null &&
      waterLevel === null
    ) {
      return NextResponse.json({ success: false, error: "no_reading_fields" }, { status: 400 });
    }

    // If no DB configured, persist to a local dev file so gateway payloads are not lost
    if (!process.env.DATABASE_URL) {
      try {
        const devPath = path.resolve(process.cwd(), "dev_readings.jsonl");
        const entry = {
          timestamp: new Date().toISOString(),
          sensor_id: sensorId,
          temperature,
          ph,
          turbidity,
          dissolvedOxygen,
          waterLevel,
        };
        // append as JSON lines
        await import("node:fs/promises").then((fs) => fs.appendFile(devPath, JSON.stringify(entry) + "\n"));
      } catch (ioErr) {
        // Non-fatal: still return success to the gateway but include a warning
        return NextResponse.json({ success: true, warning: "no_database_configured", detail: String(ioErr) }, { status: 201 });
      }

      return NextResponse.json({ success: true, warning: "no_database_configured" }, { status: 201 });
    }

    // Insert into DB when configured
    const { db } = await import("~/server/db");
    const { waterReadingsTable } = await import("~/server/db/schema");

    const insertObj: Record<string, number | string> = {};
    if (temperature !== null && !Number.isNaN(temperature)) insertObj.temperature = temperature;
    if (ph !== null && !Number.isNaN(ph)) insertObj.ph = ph;
    if (turbidity !== null && !Number.isNaN(turbidity)) insertObj.turbidity = turbidity;
    if (dissolvedOxygen !== null && !Number.isNaN(Number(dissolvedOxygen))) insertObj.dissolved_oxygen = Number(dissolvedOxygen);
    if (waterLevel !== null && !Number.isNaN(Number(waterLevel))) insertObj.water_level = Number(waterLevel);
    if (sensorId) insertObj.sensor_id = sensorId;

    try {
      await db.insert(waterReadingsTable).values(insertObj);
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      return NextResponse.json({ success: false, error: "db_insert_failed", detail: msg }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.max(1, Math.min(1000, Number(limitParam))) : 1;

    const toReading = (data: Record<string, unknown>) => ({
      temperature: Number(data.temperature ?? data.temperature_C),
      ph: Number(data.ph),
      turbidity: Number(data.turbidity ?? data.turbidity_kd),
      dissolvedOxygen: Number(data.dissolved_oxygen ?? data.dissolvedOxygen),
      waterLevel: Number(data.water_level ?? data.waterLevel),
      salinity: data.salinity ?? null,
      currentSpeed: data.current_speed ?? data.currentSpeed ?? null,
      timestamp: data.created_at ?? data.timestamp,
      source: data.source ?? "db",
    });

    if (!process.env.DATABASE_URL) {
      if (limit === 1) return NextResponse.json(await getFallbackReading());
      const rows = await getFallbackReadings(limit);
      return NextResponse.json({ success: true, data: rows });
    }

    const { desc } = await import("drizzle-orm");
    const { db } = await import("~/server/db");
    const { waterReadingsTable } = await import("~/server/db/schema");

    const result = await db
      .select()
      .from(waterReadingsTable)
      .orderBy(desc(waterReadingsTable.created_at))
      .limit(limit);

    if (!result || result.length === 0) {
      if (limit === 1) return NextResponse.json(await getFallbackReading());
      const rows = await getFallbackReadings(limit);
      return NextResponse.json({ success: true, data: rows });
    }

    if (limit === 1) {
      const firstReading = result[0];
      if (!firstReading) {
        throw new Error("No readings available");
      }

      return NextResponse.json({ success: true, data: toReading(firstReading) });
    }

    // Map DB rows into a consistent shape and return chronological order (oldest first)
    const mapped = result.map((data) => toReading(data)).reverse();

    return NextResponse.json({ success: true, data: mapped });
  } catch (err) {
    try {
      return NextResponse.json(await getFallbackReading());
    } catch (fallbackError) {
      const errorMessage =
        fallbackError instanceof Error ? fallbackError.message : (err instanceof Error ? err.message : String(err));
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 },
      );
    }
  }
}
