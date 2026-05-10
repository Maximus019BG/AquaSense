import { NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("water_readings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      temperature: data.temperature,
      ph: data.ph,
      turbidity: data.turbidity,
      dissolvedOxygen: data.dissolved_oxygen,
      waterLevel: data.water_level,
      timestamp: data.created_at,
    },
  });
}