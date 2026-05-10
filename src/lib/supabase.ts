import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type WaterReading = {
  id: number;
  timestamp: string;
  temperature: number;
  ph: number;
  turbidity: number;
  dissolved_o2: number;
  water_level: number;
  is_anomaly: boolean;
};

export type WaterReadingDb = {
  id: string;
  sensor_id: string | null;
  temperature: number;
  ph: number;
  turbidity: number;
  dissolved_oxygen: number;
  water_level: number;
  created_at: string;
};