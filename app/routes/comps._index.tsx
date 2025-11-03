import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";
// 🛑 FIX: Correct import for the TipsterHeader component
import { TipsterHeader } from "../components/TipsterHeader"; 

// --- LOADER FUNCTION: FETCHING TIPSTER AND COMPETITIONS ---
export const loader = async ({ request }: LoaderFunctionArgs) => { 
  const { supabaseClient } = createSupabaseServerClient(request);

  // 1. Check for logged-in user session (SECURELY)
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(); 
  
  if (userError || !user) {
    return redirect("/auth");
  }

  // 2. Get the logged-in Supabase user ID (UUID)
  const authUserId = user.id;

  // 3. Fetch the associated tipster details (ID, Nickname, Slogan)
  const { data: profileData, error: profileError } = await supabaseClient
    .from("user_profiles")
    .select("tipster:tipster_id(id, tipster_nickname, tipster_slogan)")
    .eq("id", authUserId) 
    .single();

  if (profileError || !profileData || !profileData.tipster) {
    console.error("Error fetching user profile or tipster details:", profileError);
    return redirect("/auth"); 
  }

  const tipsterId = profileData.tipster.id;
  const tipsterDetails = profileData.tipster;

  // 4. Fetch the competition names and slogan
  const { data: compsData, error: compsError } = await supabaseClient
    .from("comp_tipster")
    .select("comp!inner(id, comp_name, comp_slogan)")
    .eq("tipster", tipsterId); 

  if (compsError) {
    console.error("Error fetching tipster comps:", compsError);
    throw new Response("Could not load competition data", { status: 500 });
  }

  // Extract the competition objects
  let competitions = compsData.map(item => item.comp);

  // 5. Call the RPC function for each competition to get the tipster count concurrently
  const competitionsWithCount = await Promise.all(
    competitions.map(async (comp) => {
      // Call the RPC function
      const { data: countData, error: countError } = await supabaseClient.rpc(
        'get_tipster_count_by_comp', 
        { comp_id_in: comp.id } 
      );
      
      if (countError) {
        console.error(`Error fetching count for comp ${comp.id}:`, countError);
        return { ...comp, tipster_count: 0 }; 
      }

      return {
        ...comp,
        tipster_count: countData as number,
      };
    })
  );

  // Return competitions with count and tipster details
  return json({ competitions: competitionsWithCount, tipsterDetails });
};

// --- REACT COMPONENT: RENDERING DATA (MODIFIED) ---
export default function Comps() {
  const { competitions, tipsterDetails } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-xl mx-auto lg:max-w-7xl">
      
      {/* 🛑 FIX: Use the reusable TipsterHeader component */}
      <TipsterHeader nickname={tipsterDetails.tipster_nickname} />

      {/* MODIFIED: "My Comps" heading with chess_knight icon */}
      <div className="flex items-center mb-4 pb-2 border-b border-gray-300">
        {/* Chess Knight Icon */}
        <span 
          className="material-symbols-outlined mr-1 text-3xl text-main"
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 30" }}
        >
          chess_knight
        </span>
        
        {/* New H2 Text */}
        <h2 className="text-2xl font-heading font-semibold text-blackmain">
          My Comps:
        </h2>
      </div>

      {competitions.length === 0 ? (
        <p className="text-gray-500 italic font-body">
          You are not currently part of any tipping competitions.
        </p>
      ) : (
        <ul 
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          {competitions.map((comp) => (
            <li 
              key={comp.id} 
              className="p-4 bg-white  hover:bg-mainlight  rounded-full border border-main relative" 
            >
              
              {/* --- TOP RIGHT: Icon and Tipster Count --- */}
              <div 
                className="absolute top-4 right-4 flex items-center space-x-1"
              >
                {/* Icon */}
                <span className="material-symbols-outlined text-2xl text-main">
                    emoji_people
                </span>
                
                {/* Number in a Circle */}
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-second text-main text-xs font-bold ">
                    {comp.tipster_count}
                </span>
              </div>
              
              {/* --- TOP LEFT: Comp Name --- */}
              <Link 
                to={`/comps/${comp.id}`} 
                className="text-lg font-bold text-main active:text-second transition block pl-2 pr-16"
              >
                {comp.comp_name}
              </Link>
              

              
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}