// app/routes/comps.$comp_id._layout.tsx

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Outlet } from "@remix-run/react"; 
import { createSupabaseServerClient } from "~/supabase/supabase.server";

// --- TYPE DEFINITIONS ---
export type RacedayData = {
  comp_raceday_id: number; 
  raceday_id: number;
  raceday_name: string;
  raceday_date: string;
  race_count: number;
  racetrack_name: string;
  racetrack_locref: string;
};

export type CompData = {
  compName: string;
  tipsters: {
    tipster_nickname: string;
    tipster_slogan: string | null;
  }[];
  racedays: RacedayData[];
  tipsterNickname: string | null; 
};

// --- LOADER FUNCTION: FETCHING COMPETITION DATA ---
// This loader runs once for all nested competition routes (index, tip, etc.)
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { supabaseClient } = createSupabaseServerClient(request);

  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    return redirect("/auth");
  }

  const compId = params.comp_id; 
  
  // 💡 FIX: IMPROVED DIAGNOSTIC CHECK
  if (!compId || isNaN(Number(compId))) {
    const errorMessage = compId ? "Competition ID is not a valid number." : "Missing competition ID in URL parameters. Check routing.";
    throw new Response(errorMessage, { status: 400 });
  }
  
  const numericCompId = Number(compId);
  
  // 1. Fetch the user's tipster NICKNAME
  const { data: profile, error: profileError } = await supabaseClient
    .from("user_profiles")
    .select("tipster:tipster_id(tipster_nickname)")
    .eq("id", user.id)
    .single();

  let tipsterNickname: string | null = null;
  if (profileError || !profile || !profile.tipster) {
    console.warn("User profile (tipster details) not found or error:", profileError);
  } else {
    tipsterNickname = profile.tipster.tipster_nickname;
  }
  
  // 2. Fetch competition and all participating tipsters
  const { data, error } = await supabaseClient
    .from("comp")
    .select(
      `
      comp_name,
      comp_tipster!inner (
        tipster!inner (
          tipster_nickname,
          tipster_slogan
        )
      )
      `
    )
    .eq("id", numericCompId) 
    .single();

  if (error || !data) {
    console.error("Error fetching comp details:", error);
    throw new Response("Competition not found or data error", { status: 404 });
  }

  const compName = data.comp_name;
  const tipsters = data.comp_tipster.map(ct => ct.tipster);

  // 3. Fetch Raceday and Race Count data via RPC
  const { data: racedayData, error: racedayError } = await supabaseClient.rpc(
    'get_comp_racedays_with_race_count', 
    { comp_id_in: numericCompId }
  );
  
  if (racedayError) {
    console.error("Error fetching raceday data:", racedayError);
  }

  const racedays: RacedayData[] = racedayData || [];

  return json({ compName, tipsters, racedays, tipsterNickname } as CompData);
};


// --- REACT COMPONENT: MINIMAL WRAPPER ---
export default function CompLayout() {
    // This file only provides the Outlet for child routes (comps.$comp_id.tsx, tip.tsx)
    // All data is passed down via the loader above.
    return <Outlet />;
}