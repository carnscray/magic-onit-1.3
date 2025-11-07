// app/routes/comps.$comp_id._layout.tsx

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Outlet } from "@remix-run/react"; 
import { createSupabaseServerClient } from "~/supabase/supabase.server";
import CompTipsters from "~/components/Comp_Tipsters"; 
import CompRacedayLive from "~/components/Comp_RacedayLive"; 
import CompRacedayPast from "~/components/Comp_RacedayPast"; 

// --- TYPE DEFINITIONS (UNCHANGED) ---
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
};

// --- LOADER FUNCTION: FETCHING COMPETITION AND TIPSTERS (OPTIMIZED) ---
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);

  // 💡 OPTIMIZATION: Use getSession() for a faster authentication check.
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !session) {
    return redirect("/auth", { headers });
  }

  const compId = params.comp_id; 
  if (!compId || isNaN(Number(compId))) {
    throw new Response("Invalid competition ID format", { status: 400 });
  }
  const numericCompId = Number(compId);
  
  // 2. Fetch competition and all participating tipsters
  // (This heavy query is needed and cannot be easily deferred, but it's now decoupled from auth latency)
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

  // 💡 OPTIMIZATION: Add Cache-Control headers for layout data that changes infrequently.
  return json(
    { compName, tipsters, racedays } as CompData,
    {
      headers: {
        'Cache-Control': 'max-age=180, private' // Cache this layout data for 3 minutes
      }
    }
  );
};


// --- REACT COMPONENT: DISPLAYING DATA (UNCHANGED) ---
export default function CompHome() {
  const { compName, tipsters, racedays } = useLoaderData<typeof loader>();
  
  return (
    <div className="p-2 max-w-xl mx-auto lg:max-w-7xl"> 
      
      <h1 className="text-3xl font-heading font-extrabold text-main border-b pt-4 pb-2 pl-4">
        {compName}
      </h1>

      <CompRacedayLive racedays={racedays} /> 
      
      <CompTipsters tipsters={tipsters} />
      
      <CompRacedayPast racedays={racedays} /> 

      {/* The Outlet component renders the child route */}
      <div className="mt-12 pt-8 ">
        <Outlet />
      </div>

    </div>
  );
}