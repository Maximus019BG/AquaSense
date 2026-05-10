"use server";

import { supabase } from "~/lib/supabase";

export async function getLatestReading() {
  const { data, error } = await supabase
    .from("water_readings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getHistoricalReadings(hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("water_readings")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return data;
}