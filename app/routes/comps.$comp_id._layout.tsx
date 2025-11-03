// app/routes/comps.$comp_id.tsx

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Outlet } from "@remix-run/react"; 
import { createSupabaseServerClient } from "~/supabase/supabase.server";
import CompTipsters from "~/components/Comp_Tipsters"; 
import CompRacedayLive from "~/components/Comp_RacedayLive"; 
import CompRacedayPast from "~/components/Comp_RacedayPast"; 

import { TipsterHeader } from "../components/TipsterHeader"; 

// --- TYPE DEFINITIONS (UPDATED) ---
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
  // 💡 NEW FIELD: Tipster nickname for the logged-in user
  tipsterNickname: string | null; 
};

// --- LOADER FUNCTION: FETCHING COMPETITION AND TIPSTERS (UPDATED) ---
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { supabaseClient } = createSupabaseServerClient(request);

  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    return redirect("/auth");
  }

  const compId = params.comp_id; 
  if (!compId || isNaN(Number(compId))) {
    throw new Response("Invalid competition ID format", { status: 400 });
  }
  const numericCompId = Number(compId);
  
  // 💡 NEW LOGIC: 1. Fetch the user's tipster NICKNAME
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
  // --- END NEW LOGIC ---

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

  // 💡 UPDATED RETURN: Include tipsterNickname
  return json({ compName, tipsters, racedays, tipsterNickname } as CompData);
};


// --- REACT COMPONENT: DISPLAYING DATA (UPDATED) ---
export default function CompHome() {
  // 💡 DESTRUCTURE tipsterNickname
  const { compName, tipsters, racedays, tipsterNickname } = useLoaderData<typeof loader>();
  
  return (
    <div className="p-2 max-w-xl mx-auto lg:max-w-7xl"> 
      
      {/* 💡 PLACEMENT: TipsterHeader at the very top */}
      <TipsterHeader nickname={tipsterNickname} />
      
      <h1 className="text-3xl font-heading font-extrabold text-main border-b pt-4 pb-2 pl-4">
        {compName}
      </h1>

      <CompRacedayLive racedays={racedays} /> 
      


      <CompTipsters tipsters={tipsters} />
      
      <CompRacedayPast />

      {/* The Outlet component renders the child route */}
      <div className="mt-12 pt-8 ">
        <Outlet />
      </div>

    </div>
  );
}