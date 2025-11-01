import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";

// --- LOADER FUNCTION: FETCHING TIPSTER AND COMPETITIONS ---
export const loader = async ({ request }: LoaderFunctionFunctionArgs) => {
  const { supabaseClient } = createSupabaseServerClient(request);

  // 1. Check for logged-in user session
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    return redirect("/auth");
  }

  // 2. Get the logged-in Supabase user ID (UUID)
  const authUserId = session.user.id;

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
    .select("comp!inner(id, comp_name, comp_slogan)") // <-- Added comp_slogan
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
        { comp_id_in: comp.id } // Pass the competition ID to the SQL function
      );
      
      if (countError) {
        console.error(`Error fetching count for comp ${comp.id}:`, countError);
        return { ...comp, tipster_count: 0 }; // Default to 0 on error
      }

      return {
        ...comp,
        tipster_count: countData as number, // Attach the count
      };
    })
  );

  // Return competitions with count and tipster details
  return json({ competitions: competitionsWithCount, tipsterDetails });
};

// --- REACT COMPONENT: RENDERING DATA ---
export default function Comps() {
  const { competitions, tipsterDetails } = useLoaderData<typeof loader>();

  return (
    <div className="p-8 max-w-xl mx-auto lg:max-w-7xl"> {/* Expanded max-width for large screens */}
      
      {/* Tipster Nickname and Slogan Header (omitted for brevity) */}
      <div className="text-center mb-10 pb-4 border-b border-indigo-200">
        <h1 className="text-4xl font-heading font-extrabold text-indigo-700">
          Welcome, {tipsterDetails.tipster_nickname}!
        </h1>
        {tipsterDetails.tipster_slogan && (
          <p className="text-xl font-body italic mt-2 text-gray-700">
            "{tipsterDetails.tipster_slogan}"
          </p>
        )}
      </div>

      <h2 className="text-2xl font-heading font-semibold text-gray-800 mb-4 border-b pb-2">
        Your Tipping Comps:
      </h2>

      {competitions.length === 0 ? (
        <p className="text-gray-500 italic font-body">
          You are not currently part of any tipping competitions.
        </p>
      ) : (
        <ul 
          // 🛑 NEW: Responsive Grid Classes 🛑
          // 1. Default to one column (mobile)
          // 2. Use grid
          // 3. Add space between items (gap)
          // 4. On large screens (lg:), switch to 3 columns
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          {competitions.map((comp) => (
            <li 
              key={comp.id} 
              // Set position-relative for absolute positioning
              className="p-4 bg-white shadow-lg hover:shadow-xl transition-shadow rounded-xl border border-gray-100 relative" 
            >
              
              {/* --- TOP RIGHT: Icon and Tipster Count --- */}
              <div 
                className="absolute top-4 right-4 flex items-center space-x-1"
              >
                {/* Icon (Increased size to text-lg for better alignment) */}
                <span className="material-symbols-outlined text-lg text-gray-500">
                    emoji_people
                </span>
                
                {/* Number in a Circle */}
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-500 text-white text-xs font-bold shadow-md">
                    {comp.tipster_count}
                </span>
              </div>
              
              {/* --- TOP LEFT: Comp Name --- */}
              <Link 
                to={`/comps/${comp.id}`} 
                className="text-xl font-heading font-bold text-indigo-600 hover:text-indigo-800 transition block pr-16" // Added pr-16 to prevent name overlapping icon
              >
                {comp.comp_name}
              </Link>
              
              {/* --- Slogan (below Comp Name) --- */}
              {comp.comp_slogan && (
                <p className="text-sm font-body italic mt-1 text-gray-600 pr-16">
                  "{comp.comp_slogan}"
                </p>
              )}
              
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}