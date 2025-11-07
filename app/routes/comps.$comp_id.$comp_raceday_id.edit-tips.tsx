// app/routes/comps.$comp_id.$comp_raceday_id.edit-tips.tsx

import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";

// --- Types (UNCHANGED) ---
type RaceRunner = {
  runner_no: number;
  runner_name: string;
};

type RaceWithRunners = {
  race_id: number;
  race_no: number;
  runners: RaceRunner[];
};

// We only need tip_main for the form default value
type CurrentTip = {
  race_no: number;
  tip_main: number;
};

type LoaderData = {
  races: RaceWithRunners[];
  currentTips: Record<number, CurrentTip>; // { 1: { tip_main: 5, "alt": 2 }, ... }
  isLocked: boolean;
};

// --- Loader (REVERTED FOR SECURITY) ---
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const comp_raceday_id = Number(params.comp_raceday_id);

  // 1. 💡 REVERTED: Auth Check (Heavy getUser() for Security)
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    return redirect("/auth", { headers });
  }
  // const authUserId = user.id; // User ID is available directly

  const { data: profile } = await supabaseClient
    .from("user_profiles")
    .select("tipster_id") // Only fetch tipster_id
    .eq("id", user.id) // Use authenticated user ID
    .single();

  if (!profile) {
    return redirect("/auth", { headers });
  }
  const tipsterId = profile.tipster_id;

  // 2. Get Raceday data (for cutoff time) and all races/runners
  const { data: racedayData, error } = await supabaseClient
    .from("comp_raceday")
    .select(
      `
      racecard_day (
        id,
        racecard_cutofftimeUTC,
        racecard_race (
          id,
          race_no,
          racecard_runner (
            runner_no,
            runner_name
          )
        )
      )
    `
    )
    .eq("id", comp_raceday_id)
    .single();

  if (error || !racedayData?.racecard_day) {
    throw new Response("Raceday not found", { status: 404 });
  }

  const { racecard_day } = racedayData;
  const { racecard_cutofftimeUTC, racecard_race } = racecard_day;

  // 3. Check Lockout Time (Using your manual date)
  let isLocked = false;
  const now = new Date('2025-10-25T09:00:00+11:00'); // Your test date
  // const now = new Date(); // Production
  
  if (racecard_cutofftimeUTC) {
    const cutoff = new Date(racecard_cutofftimeUTC);
    if (now > cutoff) {
      isLocked = true;
    }
  }

  // 4. Format Race/Runner data
  const races: RaceWithRunners[] = racecard_race
    .map((race) => ({
      race_id: race.id,
      race_no: race.race_no,
      runners: race.racecard_runner.sort((a, b) => a.runner_no - b.runner_no),
    }))
    .sort((a, b) => a.race_no - b.race_no);

  // 5. Get User's Current Tips (Main tip only)
  const { data: currentTipsData } = await supabaseClient
    .from("tipster_tips_header")
    .select("tipster_tips_detail (race_no, tip_main)") // <-- Only fetch tip_main
    .eq("comp_raceday", comp_raceday_id)
    .eq("tipster", tipsterId)
    .maybeSingle();

  const currentTips: Record<number, CurrentTip> = {};
  if (currentTipsData?.tipster_tips_detail) {
    currentTipsData.tipster_tips_detail.forEach((tip: CurrentTip) => {
      currentTips[tip.race_no] = tip;
    });
  }

  // 💡 CACHING: Added Cache-Control header
  return json(
    { races, currentTips, isLocked },
    { 
        headers: {
            ...headers,
            'Cache-Control': 'max-age=30, private' // Cache for 30 seconds
        }
    }
  );
};

// --- 💡 Action (REVERTED FOR SECURITY) ---
export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();
  
  const comp_raceday_id = Number(params.comp_raceday_id);
  const comp_id = Number(params.comp_id);

  // 1. 💡 REVERTED: Auth Check (Heavy getUser() for Security)
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return json({ error: "Not authorized" }, { status: 401, headers });
  }
  // const authUserId = user.id; // User ID is available directly

  const { data: profile } = await supabaseClient
    .from("user_profiles")
    .select("tipster_id") // Only fetch tipster_id
    .eq("id", user.id) // Use authenticated user ID
    .single();

  if (!profile) {
    return json({ error: "Profile not found" }, { status: 404, headers });
  }
  const tipster_id = profile.tipster_id;

  // 2. Security Check: Re-check lockout time
  const { data: racedayData } = await supabaseClient
    .from("comp_raceday")
    .select("racecard_day(racecard_cutofftimeUTC)")
    .eq("id", comp_raceday_id)
    .single();
    
  const cutoffTime = racedayData?.racecard_day?.racecard_cutofftimeUTC;
  const now = new Date('2025-10-25T09:00:00+11:00'); // Your test date
  // const now = new Date(); // Production

  if (cutoffTime && new Date(cutoffTime) < now) {
    return json({ error: "Tips are locked." }, { status: 403, headers });
  }

  // 3. 💡 MODIFIED: Build the JSONB Payload 
  //    Format: {"1": {"main": 5, "alt": null}}
  const raceNumbers: number[] = JSON.parse(String(formData.get("raceNumbers")));
  const tips_payload: Record<string, { main: number | null; alt: number | null }> = {};
  
  for (const raceNo of raceNumbers) {
    const mainTip = Number(formData.get(`main_${raceNo}`)) || null;
    
    // Only add to payload if a main tip is selected
    if (mainTip) {
      tips_payload[raceNo] = {
        main: mainTip,
        alt: null // <-- Set tip_alt to null
      };
    }
  }

  // 4. Call the SQL Upsert function
  const { error: rpcError } = await supabaseClient.rpc("upsert_my_tips", {
    comp_raceday_id_in: comp_raceday_id,
    tipster_id_in: tipster_id,
    tips_payload: tips_payload, // <-- Send the complex payload
  });

  if (rpcError) {
    console.error("RPC Error:", rpcError);
    return json({ error: "Failed to save tips." }, { status: 500, headers });
  }

  // 5. Success. Redirect back to the parent page.
  return redirect(`/comps/${comp_id}/${comp_raceday_id}`, { headers });
};


// --- Component (UNCHANGED) ---
export default function EditTips() {
  const { races, currentTips, isLocked } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";
  
  // Create a JSON string of all race numbers to pass to the action
  const raceNumbers = JSON.stringify(races.map(r => r.race_no));

  return (
    <div className="p-2 max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="my-12 p-4 bg-gradient-custom text-white rounded-t-2xl">
                {/* Left side: Icon and Title */}
                <div className="flex items-center space-x-3">
                    <span className="material-symbols-outlined text-3xl">
                        edit_square
                    </span>
                    <h2 className="text-2xl font-heading font-semibold">
                        Edit My Tips
                    </h2>
                </div>
                    
      </div>

      <div className="bg-white p-6 shadow-xl rounded-b-2xl -mt-12 space-y-8 mb-12">
        {isLocked ? (
          // --- 1. LOCKED STATE ---
          <div className="text-center p-8">
            <span className="material-symbols-outlined text-6xl text-gray-400">
              lock
            </span>
            <h2 className="text-2xl font-bold text-gray-700 mt-4">
              Tips Are Locked
            </h2>
            <p className="text-gray-500">
              The cutoff time for this raceday has passed.
            </p>
          </div>

        ) : (
          // --- 2. OPEN STATE (THE FORM) ---
          <Form method="post">
            {/* Pass all race numbers to the action */}
            <input type="hidden" name="raceNumbers" value={raceNumbers} />

            <div className="space-y-4">
              {/* --- Grid Header --- */}
              <div className="grid grid-cols-12 gap-4 text-sm font-bold tracking-wider text-blackmain ">
                <div className="col-span-3">RACE</div>
                <div className="col-span-9">SELECTION</div>
              </div>

              {races.map((race) => (
                <div key={race.race_no} className="grid grid-cols-12 gap-4 items-center">
                  
                  {/* --- Col 1: Race No. --- */}
                  <div className="col-span-3">
                    <label 
                      htmlFor={`main_${race.race_no}`}
                      className="block text-lg font-bold text-main"
                    >
                      Race {race.race_no}
                    </label>
                  </div>

                  {/* --- Col 2: Main Tip --- */}
                  <div className="col-span-9">
                    <select
                      id={`main_${race.race_no}`}
                      name={`main_${race.race_no}`}
                      defaultValue={currentTips[race.race_no]?.tip_main}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                    >
                      <option value="">Select runner...</option>
                      {race.runners.map(r => (
                        <option key={r.runner_no} value={r.runner_no}>
                          {r.runner_no}. {r.runner_name}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>
              ))}
            </div>
            
            {/* Form Footer */}
            <div className="p-3 mt-6 bg-gray-50 border-t flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-alt text-white font-semibold py-2 px-5 rounded-md  active:bg-altlight active:scale-[0.95] transform"

              >
                {isSaving ? "Saving..." : "Save All"}
              </button>
            </div>

          </Form>
        )}
      </div>
    </div>
  );
}