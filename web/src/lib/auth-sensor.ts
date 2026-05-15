import { NextRequest, NextResponse } from "next/server";

export function validateSensorApiKey(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.SENSOR_API_KEY) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  return null;
}
