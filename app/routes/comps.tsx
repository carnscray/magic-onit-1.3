import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";

// --- LOADER FUNCTION: FETCHING TIPSTER AND COMPETITIONS ---
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabaseClient } = createSupabaseServerClient(request);

  // 1. Check for logged-in user session
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    return redirect("/auth");
  }

  // 2. Get the logged-in Supabase user ID (UUID)
  const authUserId = session.user.id;

  // 3. Fetch the associated tipster details (ID, Nickname, Slogan)
  // This combines steps 3 and the new tipster detail requirement.
  const { data: profileData, error: profileError } = await supabaseClient
    .from("user_profiles")
    .select("tipster:tipster_id(id, tipster_nickname, tipster_slogan)") // Join and fetch tipster details
    .eq("id", authUserId) 
    .single();

  // Handle case where tipster profile is missing
  if (profileError || !profileData || !profileData.tipster) {
    console.error("Error fetching user profile or tipster details:", profileError);
    return redirect("/auth"); 
  }

  const tipsterId = profileData.tipster.id;
  const tipsterDetails = profileData.tipster; // Contains nickname and slogan

  // 4. Fetch the competition names the tipster is part of
  const { data: compsData, error: compsError } = await supabaseClient
    .from("comp_tipster")
    .select("comp!inner(id, comp_name)") 
    .eq("tipster", tipsterId); 

  if (compsError) {
    console.error("Error fetching tipster comps:", compsError);
    throw new Response("Could not load competition data", { status: 500 });
  }

  // Extract the competition objects into a simple array
  const competitions = compsData.map(item => item.comp);

  // Return both competitions and tipster details
  return json({ competitions, tipsterDetails });
};


// --- REACT COMPONENT: RENDERING DATA ---
export default function Comps() {
  const { competitions, tipsterDetails } = useLoaderData<typeof loader>();

  return (
    <div className="p-8 max-w-xl mx-auto">
      
      {/* NEW: Tipster Nickname and Slogan Header */}
      <div className="text-center mb-10 pb-4 border-b border-indigo-200">
        <h1 className="text-4xl font-extrabold text-indigo-700">
          Welcome, {tipsterDetails.tipster_nickname}!
        </h1>
        {tipsterDetails.tipster_slogan && (
          <p className="text-xl font-medium text-gray-600 italic mt-2">
            "{tipsterDetails.tipster_slogan}"
          </p>
        )}
      </div>

      <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b pb-2">
        You tipping comps:
      </h2>

      {competitions.length === 0 ? (
        <p className="text-gray-500 italic">
          You are not currently part of any tipping competitions.
        </p>
      ) : (
        <ul className="space-y-4">
          {competitions.map((comp) => (
            <li 
              key={comp.id} 
              className="p-4 bg-white shadow-lg rounded-xl border border-gray-200"
            >
              <Link 
                to={`/comp/${comp.id}`} 
                className="text-xl font-medium text-green-600 hover:text-green-800 transition duration-150 block"
              >
                {comp.comp_name}
              </Link>
              <p className="text-sm text-gray-500 mt-1">
                Click the name to view the competition dashboard.
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}