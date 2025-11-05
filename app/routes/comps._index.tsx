import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";
import { TipsterHeader } from "../components/TipsterHeader"; 

// --- LOADER FUNCTION: FETCHING TIPSTER AND COMPETITIONS (UNCHANGED) ---
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
    <div className="p-2 max-w-xl mx-auto lg:max-w-7xl">
      
      <TipsterHeader nickname={tipsterDetails.tipster_nickname} />

    {/* 💡 FIX: The entire section is now correctly structured and contained within the main div */}
    <section className="my-12 rounded-2xl shadow-xl overflow-hidden"> 
        
        {/* Header Styling */}
        <div className="flex items-center justify-between space-x-3 p-4 bg-gradient-custom text-white rounded-t-2xl">
            
            {/* Left side: Icon and Title */}
            <div className="flex items-center space-x-3">
                <span className="material-symbols-outlined text-3xl">
                    chess_knight
                </span>
                
                <h2 className="text-2xl font-heading font-semibold">
                    My Comps 
                </h2>
            </div>
            
            {/* Right side: Competition Count Badge (FIXED: Using competitions.length) */}
            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white text-main text-base font-bold  flex-shrink-0">
                {competitions.length}
            </span>
        </div>
        
        {/* Content Container (Matches the p-6 bg-white style used elsewhere) */}
        <div className="p-6 bg-white">
            {competitions.length === 0 ? (
                <p className="text-gray-500 italic font-body">
                    You are not currently part of any tipping competitions.
                </p>
            ) : (
                <ul 
                    className="grid grid-cols-1 gap-4 lg:grid-cols-3"
                >
                    {competitions.map((comp) => (
                        <li 
                            key={comp.id} 
                            className="p-4 bg-white shadow-lg rounded-lg border border-gray-100 hover:shadow-xl transition-shadow relative" 
                        >
                            <Link 
                                to={`/comps/${comp.id}`} 
                                className="block"
                            >
                                <div className="flex items-start justify-between">
                                    {/* --- LEFT SIDE: Comp Name and Slogan --- */}
                                    <div className="flex-grow min-w-0 pr-4">
                                        {/* Comp Name (Primary Title) */}
                                        <p className="text-xl font-heading font-bold text-main truncate"> 
                                            {comp.comp_name}
                                        </p>
                                        
                                        {/* Comp Slogan (Secondary Detail) */}
                                        <p className="text-sm font-body text-gray-500 italic truncate mt-0.5"> 
                                            {comp.comp_slogan || "A challenging competition awaits!"}
                                        </p>
                                    </div>

                                    {/* --- RIGHT SIDE: Tipster Count Badge --- */}
                                    <div className="flex items-center space-x-1 flex-shrink-0">
                                        {/* Icon */}
                                        <span className="material-symbols-outlined text-2xl text-main">
                                            emoji_people
                                        </span>
                                        
                                        {/* Number in a Circle (Badge) */}
                                        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-second text-main text-lg font-bold shadow-md">
                                            {comp.tipster_count}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    </section>
  </div>
  );
}