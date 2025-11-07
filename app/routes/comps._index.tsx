// app/routes/comps._index.tsx (Full file)

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link, useFetcher } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";

import { useState, useEffect } from "react";

// --- LOADER FUNCTION: FETCHING TIPSTER AND COMPETITIONS (MODIFIED FOR SPEED) ---
export const loader = async ({ request }: LoaderFunctionArgs) => { 
  const { supabaseClient, headers } = createSupabaseServerClient(request);

  // 1. 💡 MODIFIED: Use getSession to quickly check authentication status
  const { data: { session } } = await supabaseClient.auth.getSession(); 
  
  if (!session) {
    // This is the fastest way to check if a user is logged in
    return redirect("/auth", { headers });
  }

  // 2. [REMOVED] Redundant fetch of user ID and profile data is removed.
  const authUserId = session.user.id; 

  // 3. 💡 MODIFIED: Fetch ONLY the tipster ID and user role necessary for THIS route's logic.
  //    This replaces the slow, repeated 'user_profiles' query from the old Step 3.
  const { data: profileData, error: profileError } = await supabaseClient
    .from("user_profiles")
    .select("tipster:tipster_id(id)") // Only need the tipster ID
    .eq("id", authUserId) 
    .single();

  if (profileError) {
     console.error("Loader Error (Step 3):", profileError.message);
     throw new Response(profileError.message, { status: 500, headers });
  }

  if (!profileData || !profileData.tipster) {
    console.error("Loader Error (Step 3): No tipster link found.");
    return redirect("/auth", { headers }); 
  }

  const tipsterId = profileData.tipster.id;

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
    return json({ competitions: [] }, { headers });
  }

  // 💡 MODIFIED: Extract the competition objects directly.
  const competitions = compsData.map(item => ({
    ...item.comp,
    tipster_count: 0, // Placeholder
  }));
  

  // 5. [REMOVED] The slow Promise.all and RPC call for tipster count is removed.

  // 💡 CACHING ADDED: Return the competition data with Cache-Control header.
  return json(
    { competitions }, 
    { 
      headers: {
        ...headers,
        'Cache-Control': 'max-age=60, private' // Cache for 60 seconds
      } 
    }
  );
};

// --- REACT COMPONENT: RENDERING DATA (MODIFIED) ---
export default function Comps() {
  // The 'competitions' type no longer contains 'tipster_count' here.
  const { competitions } = useLoaderData<typeof loader>(); 
  const fetcher = useFetcher<typeof import("~/routes/api.join-comp").action>();

  // State to control the modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter for visible comps
  const visibleComps = competitions.filter(
    (comp: any) => {
      const privacy = (comp.comp_privacy || '').trim().toLowerCase();
      return privacy !== "global_private" && privacy !== "hidden";
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
    }
  }, [actionData]);


  return (
    <>
      <div className="p-2 max-w-xl mx-auto lg:max-w-7xl">
        

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
              
              {/* --- 💡 MODIFICATION: Icon and Text Button --- */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 text-lg font-medium cursor-pointer hover:opacity-75"
                aria-label="Join a Competition"
              >
                <span>Join</span> {/* 💡 ADDED TEXT */}
                <span className="material-symbols-outlined text-3xl">share</span>
                
              </button>
              {/* --- END MODIFICATION --- */}

          </div>
          
          {/* Content Container */}
          <div className="p-6 bg-white">

              {visibleComps.length === 0 ? (
                  <p className="text-greymain italic font-body">
                      You are not currently part of any tipping competitions.
                  </p>
              ) : (
                  <ul 
                      className="grid grid-cols-1 gap-4 lg:grid-cols-3"
                  >
                      {visibleComps.map((comp: any) => (
                          <li 
                              key={comp.id} 
                              className="relative" 
                          >
                              <Link 
                                  to={`/comps/${comp.id}`} 
                                  className="p-4 bg-white shadow-lg rounded-lg border border-gray-100 transition-all duration-200 block w-full h-full 
                                             hover:shadow-xl hover:bg-mainlight active:bg-second active:scale-[0.9] focus:bg-second transform"
                              >
                                  <div className="flex items-start justify-between">
                                      <div className="flex-grow min-w-0 pr-4">
                                          <p className="text-xl font-heading font-bold text-main whitespace-normal break-words"> 
                                              {comp.comp_name}
                                          </p>
                                          <p className="text-sm font-body text-gray-500  whitespace-normal break-words mt-0.5"> 
                                              {comp.comp_slogan || "-"}
                                          </p>
                                      </div>
                                      {/* 💡 REMOVED: Tipster count icon and circle removed block is here */}
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
                  className="px-4 py-2 rounded-md text-blackmain bg-mainlight active:scale-[0.95] transform"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-white bg-alt  disabled:opacity-50 active:bg-altlight active:scale-[0.95] transform"
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