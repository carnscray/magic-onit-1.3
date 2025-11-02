import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
// 💡 CHANGE 1: Import Outlet
import { Link, useLoaderData, Outlet } from "@remix-run/react"; 
import { createSupabaseServerClient } from "~/supabase/supabase.server";

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

// --- LOADER FUNCTION: FETCHING COMPETITION AND TIPSTERS (UNCHANGED) ---
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

  // 1. Fetch competition and tipster data
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

  // 2. Fetch Raceday and Race Count data via RPC
  const { data: racedayData, error: racedayError } = await supabaseClient.rpc(
    'get_comp_racedays_with_race_count', 
    { comp_id_in: numericCompId }
  );
  
  if (racedayError) {
    console.error("Error fetching raceday data:", racedayError);
  }

  const racedays: RacedayData[] = racedayData || [];

  return json({ compName, tipsters, racedays } as CompData);
};

// --- REACT COMPONENT: DISPLAYING DATA (OUTLET ADDED) ---
export default function CompHome() {
  const { compName, tipsters, racedays } = useLoaderData<typeof loader>();
  
  // Helper to format the date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="p-8 max-w-xl mx-auto lg:max-w-7xl"> 
      
      <h1 className="text-4xl font-heading font-extrabold text-indigo-700 mb-6 border-b pb-2">
        {compName}
      </h1>

      {/* ========================================================== */}
      {/* 🏁 RACEDAYS SECTION 🏁 */}
      {/* ========================================================== */}
      <div className="flex items-center space-x-3 mb-4">
        <span className="material-symbols-outlined text-3xl text-gray-800">
            Newsmode
        </span>
        
        <h2 className="text-2xl font-heading font-semibold text-gray-800">
          Racedays
        </h2>
      </div>
      
      {racedays.length === 0 ? (
        <p className="text-gray-500 italic font-body mb-8">
          This competition has no scheduled racedays yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-10">
          {racedays.map((raceday) => (
            <li 
              key={raceday.comp_raceday_id} 
              className="p-4 bg-white shadow-lg rounded-lg border border-gray-100 hover:shadow-xl transition-shadow"
            >
              <Link to={`${raceday.comp_raceday_id}`}>
                <div className="flex justify-between items-start">
                    
                    {/* --- LEFT SIDE: Raceday Details --- */}
                    <div>
                        {/* Racetrack Name (in CAPS) */}
                        <p className="text-sm font-heading font-semibold text-gray-500 uppercase">
                            {raceday.racetrack_name}
                        </p>
                        
                        {/* Raceday Name */}
                        <p className="text-lg font-heading font-bold text-gray-800">
                            {raceday.raceday_name}
                        </p>
                        
                        {/* Date */}
                        <p className="text-sm font-body text-gray-500 mt-1">
                            {formatDate(raceday.raceday_date)}
                        </p>
                    </div>

                    {/* --- RIGHT SIDE: LocRef and Race Count --- */}
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                        {/* Racetrack LocRef (Left of the square) */}
                        <span className="text-sm font-bold text-gray-600">
                            {raceday.racetrack_locref}
                        </span>
                        
                        {/* Race Count in Square Badge */}
                        <span className="flex items-center justify-center h-8 w-8 bg-pink-500 text-white text-base font-bold shadow-md">
                            {raceday.race_count}
                        </span>
                    </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      
      {/* ========================================================== */}
      {/* 👥 TIPSTERS SECTION 👥 */}
      {/* ========================================================== */}
      
      <div className="flex items-center space-x-3 mb-4">
        <span className="material-symbols-outlined text-3xl text-gray-800">
            emoji_people
        </span>
        
        <h2 className="text-2xl font-heading font-semibold text-gray-800">
          Tipsters 
        </h2>

        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-500 text-white text-base font-bold shadow-md flex-shrink-0">
            {tipsters.length}
        </span>
      </div>

      <ul 
        className="grid grid-cols-1 gap-4 lg:grid-cols-4"
      >
        {tipsters.map((tipster, index) => (
          <li 
            key={index} 
            className="p-4 bg-white shadow-lg rounded-lg border border-gray-100 hover:shadow-xl transition-shadow"
          >
            <div className="flex justify-between items-start">
                
                {/* --- LEFT SIDE: Tipster Name and Slogan --- */}
                <div>
                    <p className="text-lg font-heading font-bold text-green-600">
                        {tipster.tipster_nickname}
                    </p>
                    {tipster.tipster_slogan && (
                        <p className="text-sm font-body text-gray-500 italic mt-1">
                            "{tipster.tipster_slogan}"
                        </p>
                    )}
                </div>

                {/* --- RIGHT SIDE: Image Placeholder --- */}
                <div className="h-24 w-24 bg-gray-200 rounded-full flex-shrink-0 ml-4"> 
                    {/* Placeholder for future image */}
                </div>

            </div>
          </li>
        ))}
      </ul>
      
      {/* ========================================================== */}
      {/* 💡 CHANGE 2: The Outlet component renders the child route 💡 */}
      {/* ========================================================== */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <Outlet />
      </div>

    </div>
  );
}