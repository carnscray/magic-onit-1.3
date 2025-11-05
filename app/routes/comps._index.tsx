// app/routes/comps._index.tsx (Full file)

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link, useFetcher } from "@remix-run/react"; // <-- ADD useFetcher
import { createSupabaseServerClient } from "~/supabase/supabase.server";
import { TipsterHeader } from "../components/TipsterHeader"; 
import { useState, useEffect } from "react"; // <-- ADD useState, useEffect

// --- LOADER FUNCTION: FETCHING TIPSTER AND COMPETITIONS ---
// (This loader function remains unchanged from Step 27)
export const loader = async ({ request }: LoaderFunctionArgs) => { 
  const { supabaseClient, headers } = createSupabaseServerClient(request);

  // 1. Check for logged-in user session (SECURELY)
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(); 
  
  if (userError || !user) {
    return redirect("/auth", { headers });
  }

  // 2. Get the logged-in Supabase user ID (UUID)
  const authUserId = user.id;

  // 3. Fetch the associated tipster details (ID, Nickname, Slogan)
  const { data: profileData, error: profileError } = await supabaseClient
    .from("user_profiles")
    .select("tipster:tipster_id(id, tipster_nickname, tipster_slogan)")
    .eq("id", authUserId) 
    .maybeSingle();

  if (profileError) {
     console.error("Loader Error (Step 3):", profileError.message);
     throw new Response(profileError.message, { status: 500, headers });
  }

  if (!profileData || !profileData.tipster) {
    console.error("Loader Error (Step 3): No profile data or tipster link found.");
    return redirect("/auth", { headers }); 
  }

  const tipsterId = profileData.tipster.id;
  const tipsterDetails = profileData.tipster;

  // 4. Fetch the competition names, slogan, and privacy
  const { data: compsData, error: compsError } = await supabaseClient
    .from("comp_tipster")
    .select("comp!inner(id, comp_name, comp_slogan, comp_privacy)")
    .eq("tipster", tipsterId); 

  if (compsError) {
    console.error("Loader Error (Step 4):", compsError.message);
    throw new Response("Could not load competition data", { status: 500, headers });
  }

  // 4.5. Check for zero competitions
  if (!compsData || compsData.length === 0) {
    return json({ competitions: [], tipsterDetails }, { headers });
  }

  // Extract the competition objects.
  let competitions = compsData.map(item => item.comp);
  
  // 5. Call the RPC function for each competition
  const competitionsWithCount = await Promise.all(
    competitions.map(async (comp: any) => {
      const { data: countData, error: countError } = await supabaseClient.rpc(
        'get_tipster_count_by_comp', 
        { comp_id_in: comp.id } 
      );
      
      if (countError) {
        console.error(`Loader Error (Step 5 RPC):`, countError.message);
        return { ...comp, tipster_count: 0 }; 
      }
      return {
        ...comp,
        tipster_count: countData as number,
      };
    })
  );

  return json({ competitions: competitionsWithCount, tipsterDetails }, { headers });
};

// --- REACT COMPONENT: RENDERING DATA (MODIFIED) ---
export default function Comps() {
  const { competitions, tipsterDetails } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof import("~/routes/api.join-comp").action>();

  // State to control the modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter for visible comps
  const visibleComps = competitions.filter(
    (comp: any) => {
      const privacy = (comp.comp_privacy || '').trim().toLowerCase();
      return privacy !== "global_private";
    }
  );

  // Check fetcher state
  const isSubmitting = fetcher.state === "submitting";
  const actionData = fetcher.data;

  // Close modal on successful submission
  useEffect(() => {
    if (actionData?.success) {
      setIsModalOpen(false);
      // The loader for this page will automatically re-run because
      // the fetcher POSTed and we returned { revalidate: true }
      // (though Remix often revalidates by default on POSTs)
    }
  }, [actionData]);


  return (
    <>
      <div className="p-2 max-w-xl mx-auto lg:max-w-7xl">
        
        <TipsterHeader nickname={tipsterDetails.tipster_nickname} />

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
              
              {/* --- MODIFICATION: Icon is now a button --- */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="material-symbols-outlined text-3xl cursor-pointer hover:opacity-75"
              >
                  share
              </button>
              {/* --- END MODIFICATION --- */}

          </div>
          
          {/* Content Container */}
          <div className="p-6 bg-white">

              {visibleComps.length === 0 ? (
                  <p className="text-gray-500 italic font-body">
                      You are not currently part of any tipping competitions.
                  </p>
              ) : (
                  <ul 
                      className="grid grid-cols-1 gap-4 lg:grid-cols-3"
                  >
                      {visibleComps.map((comp: any) => (
                          <li 
                              key={comp.id} 
                              className="p-4 bg-white shadow-lg rounded-lg border border-gray-100 hover:shadow-xl transition-shadow relative" 
                          >
                              <Link 
                                  to={`/comps/${comp.id}`} 
                                  className="block"
                              >
                                  <div className="flex items-start justify-between">
                                      <div className="flex-grow min-w-0 pr-4">
                                          <p className="text-xl font-heading font-bold text-main truncate"> 
                                              {comp.comp_name}
                                          </p>
                                          <p className="text-sm font-body text-gray-500 italic truncate mt-0.5"> 
                                              {comp.comp_slogan || "A challenging competition awaits!"}
                                          </p>
                                      </div>
                                      <div className="flex items-center space-x-1 flex-shrink-0">
                                          <span className="material-symbols-outlined text-2xl text-main">
                                              emoji_people
                                          </span>
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

    {/* --- NEW: JOIN COMP MODAL --- */}
    {isModalOpen && (
        <div 
          // Backdrop
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity"
          onClick={() => setIsModalOpen(false)} // Close on backdrop click
        >
          <div
            // Modal content
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()} // Prevent closing on modal click
          >
            <fetcher.Form method="post" action="/api/join-comp">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Join Comp</h2>
              
              <p className="text-sm text-gray-600 mb-6">
                Enter the CompID and Invite Code provided by the administrator.
              </p>

              <div className="mb-4">
                <label htmlFor="comp_id" className="block text-sm font-medium text-gray-700">
                  CompID
                </label>
                <input
                  type="text"
                  name="comp_id"
                  id="comp_id"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="invite_code" className="block text-sm font-medium text-gray-700">
                  Invite Code
                </label>
                <input
                  type="text"
                  name="invite_code"
                  id="invite_code"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {actionData?.error && (
                <p className="mb-4 text-sm text-red-600 text-center">
                  {actionData.error}
                </p>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Joining..." : "Join"}
                </button>
              </div>

            </fetcher.Form>
          </div>
        </div>
      )}
    {/* --- END MODAL --- */}
    </>
  );
}