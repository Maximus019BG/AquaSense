import { NextRequest, NextResponse } from "next/server";

export function validateSensorApiKey(request: NextRequest): NextResponse | null {
  const expectedApiKey = process.env.SENSOR_API_KEY;

  if (!expectedApiKey && process.env.NODE_ENV !== "production") {
    return null;
  }

  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== expectedApiKey) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  return null;
}
