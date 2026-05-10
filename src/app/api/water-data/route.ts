import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      temperature,
      ph,
      turbidity,
      dissolved_oxygen,
      water_level,
    } = body;

    if (
      temperature === undefined ||
      ph === undefined ||
      turbidity === undefined ||
      dissolved_oxygen === undefined ||
      water_level === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("water_readings")
      .insert([
        {
          temperature,
          ph,
          turbidity,
          dissolved_oxygen,
          water_level,
        },
      ])
      .select();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}