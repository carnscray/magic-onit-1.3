// app/routes/admin.results.$racecard_day_id.tsx

import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import {
  Form,
  Link,
  useFetcher,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";
import { TipsterHeader } from "~/components/TipsterHeader";

// --- Types ---
type RaceRunner = {
  runner_no: number;
  runner_name: string;
};

type RaceResult = {
  runner_no: number;
  position: number;
  wodds: number | null;
  podds: number | null;
};

type RaceData = {
  race_id: number;
  race_no: number;
  race_notes: string;
  runners: RaceRunner[];
  results: RaceResult[]; // Existing results
};

// 💡 NEW: Updated loader data type
type LoaderData = {
  raceday_id: number;
  raceday_name: string;
  raceday_date: string;
  racetrack_name: string;
  racetrack_locref: string;
  tipsterNickname: string;
  userRole: string;
  races: RaceData[];
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: `Admin: ${data?.raceday_name || "Results"}` }];
};

// --- 💡 LOADER (Updated) ---
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const racecard_day_id = Number(params.racecard_day_id);

  if (isNaN(racecard_day_id)) {
    throw new Response("Invalid Raceday ID", { status: 400 });
  }

  // 1. Auth & Admin Check
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return redirect("/auth", { headers });
  }

  const { data: profile } = await supabaseClient
    .from("user_profiles")
    .select("user_role, tipster:tipster_id(tipster_nickname)")
    .eq("id", user.id)
    .single();

  if (!profile || profile.user_role !== "superadmin") {
    return redirect("/comps", { headers });
  }
  
  // 2. Fetch Raceday, Races, Runners, and Existing Results
  const { data: racedayData, error } = await supabaseClient
    .from("racecard_day")
    .select(
      `
      id,
      racecard_name,
      racecard_date, 
      racetrack (
        track_name,
        track_locref
      ),
      racecard_race (
        id,
        race_no,
        race_notes,
        racecard_runner (
          runner_no,
          runner_name
        ),
        racecard_race_results (
          runner_no,
          position,
          wodds,
          podds
        )
      )
    `
    )
    .eq("id", racecard_day_id)
    .single();

  if (error || !racedayData) {
    throw new Response("Raceday not found", { status: 404 });
  }

  // 3. Format the data for the component
  const races: RaceData[] = racedayData.racecard_race
    .map((race) => ({
      race_id: race.id,
      race_no: race.race_no,
      race_notes: race.race_notes,
      runners: race.racecard_runner.sort((a, b) => a.runner_no - b.runner_no),
      results: race.racecard_race_results.map(r => ({
        ...r,
        wodds: r.wodds ? Number(r.wodds) : null,
        podds: r.podds ? Number(r.podds) : null,
      })).sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.race_no - b.race_no);

  // 4. Return all data
  return json(
    {
      raceday_id: racedayData.id,
      raceday_name: racedayData.racecard_name,
      raceday_date: racedayData.racecard_date,
      racetrack_name: racedayData.racetrack?.track_name ?? 'N/A',
      racetrack_locref: racedayData.racetrack?.track_locref ?? 'N/A',
      tipsterNickname: profile.tipster.tipster_nickname,
      userRole: profile.user_role,
      races,
    },
    { headers }
  );
};

// --- Action (Unchanged) ---
export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();
  const _action = String(formData.get("_action"));
  const racecard_day_id = Number(params.racecard_day_id);

  // 1. Auth & Admin Check (again for security)
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return json({ error: "Not authorized" }, { status: 401 });
  
  const { data: profile } = await supabaseClient
    .from("user_profiles")
    .select("user_role")
    .eq("id", user.id)
    .single();
    
  if (!profile || profile.user_role !== "superadmin") {
    return json({ error: "Not authorized" }, { status: 403 });
  }


  // --- ACTION: Save Race Results AND Finalize ---
  if (_action === "save_results") {
    const race_id = Number(formData.get("race_id"));
    if (!race_id) return json({ error: "Missing Race ID" }, { status: 400 });

    const resultsToUpsert = [];
    
    // 1. Loop through the 6 possible result rows from the form
    for (let i = 1; i <= 6; i++) {
      const runner_no = Number(formData.get(`runner_no_${i}`));
      const position = Number(formData.get(`position_${i}`));
      
      // Only add rows where a runner AND position are selected
      if (runner_no > 0 && position > 0) {
        resultsToUpsert.push({
          racecard_race_id: race_id,
          runner_no: runner_no,
          position: position,
          wodds: Number(formData.get(`wodds_${i}`)) || null,
          podds: Number(formData.get(`podds_${i}`)) || null,
        });
      }
    }

    // 2. Clear old results for this race first
    const { error: deleteError } = await supabaseClient
      .from("racecard_race_results")
      .delete()
      .eq("racecard_race_id", race_id);

    if (deleteError) {
       return json({ error: `Failed to clear old results: ${deleteError.message}` }, { status: 500 });
    }

    // 3. Insert new results (if any)
    if (resultsToUpsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from("racecard_race_results")
        .insert(resultsToUpsert);

      if (insertError) {
        return json({ error: `Failed to insert results: ${insertError.message}` }, { status: 500 });
      }
    }

    // 4. Automatically finalize points after every save
    const { error: rpcError } = await supabaseClient.rpc(
      "finalize_racecard_day_points",
      { racecard_day_id_in: racecard_day_id }
    );

    if (rpcError) {
      return json({ error: `Results saved, but points failed: ${rpcError.message}` }, { status: 500 });
    }

    return json({ success: true, message: `Race ${formData.get("race_no")} saved & points recalculated!` });
  }

  return json({ error: "Invalid action" }, { status: 400 });
};


// --- Helper Function ---
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

// --- 💡 Component (Main) (Updated) ---
export default function AdminResultsEntry() {
  const { 
    raceday_id,
    raceday_name,
    raceday_date,
    racetrack_name,
    racetrack_locref,
    tipsterNickname, 
    userRole,
    races 
  } = useLoaderData<typeof loader>();
  
  const navigation = useNavigation();
  
  const isPageSaving = navigation.state !== 'idle' && navigation.formData?.get('_action') === 'save_results';

  return (
    <div className="p-2 max-w-2xl mx-auto">
      <TipsterHeader nickname={tipsterNickname} />

      {/* --- NEW RACEDAY HEADER --- */}
      <div className="mb-8 p-4 border-b border-gray-200 mt-4">


        {/* 2. LocRef Square and Track Details */}
        <div className="flex items-center pl-1 space-x-3"> 
            <div className="flex-shrink-0 flex items-center justify-center min-w-[3rem] 
                          bg-white border-2 border-main "> 
                <p className="text-lg font-heading font-extrabold text-main uppercase py-2.5 px-2">
                    {racetrack_locref}
                </p>
            </div>

            <div className="flex flex-col space-y-0.5"> 
                        
                         {/* 1. Raceday Name */}
                        <p className="text-xl font-heading font-extrabold text-main  pb-1  leading-none">
                            {raceday_name} 
                        </p>

                       
                <p className="text-md font-body text-blackmain leading-none">
                    {racetrack_name} - {formatDate(raceday_date)}
                </p>
            </div>
        </div>
      </div>
      {/* --- END NEW HEADER --- */}


      {/* Page Header */}
      <div className="mt-4 p-2 bg-gradient-custom text-white rounded-t-2xl flex justify-between items-center ">
            {/* Left side: Icon and Title */}
            <div className="flex items-center space-x-3">
                <span className="material-symbols-outlined text-3xl">
                    Captive_Portal

                </span>
                
                <h2 className="text-2xl font-heading font-semibold">
                    Race Results 
                </h2>
            </div>
      </div>

      {/* Race Forms */}
      <div className="bg-white p-2 shadow-xl rounded-b-2xl pt-4 mb-12">
        {isPageSaving && (
          <div className="p-4 text-center bg-blue-100 text-blue-800 rounded-lg">
            Saving and recalculating all points...
          </div>
        )}
        
        {races.map((race) => (
          <RaceForm key={race.race_id} race={race} />
        ))}
        
      </div>
    </div>
  );
}

// --- 💡 Sub-Component: RaceForm (REFACTORED) ---
function RaceForm({ race }: { race: RaceData }) {
  const fetcher = useFetcher<typeof action>();
  const isSaving = fetcher.state !== 'idle';

  // We provide 6 rows for results. 
  // We'll pre-fill them with existing data or leave them blank.
  const resultRows = [];
  for (let i = 0; i < 6; i++) {
    resultRows.push(race.results[i] || { runner_no: 0, position: 0, wodds: null, podds: null });
  }
  
  return (
    <fetcher.Form method="post" className="border rounded-lg overflow-hidden mb-8">
      <input type="hidden" name="_action" value="save_results" />
      <input type="hidden" name="race_id" value={race.race_id} />
      <input type="hidden" name="race_no" value={race.race_no} />

      {/* --- 💡 MODIFICATION: Race Header --- */}
      <div className="p-3 bg-mainlight border-b flex justify-between items-center">
        {/* Left Side: Title */}
        <h3 className="text-xl font-bold text-main">
          Race {race.race_no}
        </h3>
        
        {/* Right Side: Status and Save Button */}
        <div className="flex items-center space-x-3">
          {fetcher.data?.success && !isSaving && (
            <p className="text-sm text-green-600">Saved & Recalculated!</p>
          )}
          {/* --- 💡 TYPO FIX: fetchall -> fetcher --- */}
          {fetcher.data?.error && !isSaving && (
             <p className="text-sm text-red-600">{fetcher.data.error}</p>
          )}

          {/* Save Icon Button */}
          <button
            type="submit"
            disabled={isSaving}
            className="text-main hover:text-blue-700 disabled:opacity-50"
            title="Save Race Results"
          >
            <span className="material-symbols-outlined text-3xl">
              {/* Show loading spinner if this form is saving */}
              {isSaving ? 'progress_activity' : 'save'}
            </span>
          </button>
        </div>
      </div>
      {/* --- END MODIFICATION --- */}


      {/* --- Results Grid --- */}
      <div className="p-2 space-y-2">
        
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-blackmain">
          <div className="col-span-2 pl-1" >Pos</div>
          <div className="col-span-6 pl-1">Runner</div>
          <div className="col-span-2 text-center">$W</div>
          <div className="col-span-2 text-center">$P</div>
        </div>

        {/* Result Rows */}
        {resultRows.map((result, i) => (
          <div key={i} className="grid grid-cols-12 text-xs text-blackmain">
            
            {/* Position Select (col-span-2) */}
            <select
              name={`position_${i + 1}`}
              defaultValue={result.position}
              className="col-span-2 p-2 mr-1 border rounded-md"
            >
              <option value="0">Pos...</option>
              <option value="1">1st</option>
              <option value="2">2nd</option>
              <option value="3">3rd</option>
              <option value="4">4th</option>
            </select>
            
            {/* Runner Select (col-span-6) */}
            <select
              name={`runner_no_${i + 1}`}
              defaultValue={result.runner_no}
              className="col-span-6 p-2 mr-1 border rounded-md"
            >
              <option value="0">Select runner...</option>
              {race.runners.map(r => (
                <option key={r.runner_no} value={r.runner_no}>
                  {r.runner_no}. {r.runner_name}
                </option>
              ))}
            </select>
            
            {/* W-Odds Input (col-span-2) */}
            <input
              type="number"
              step="0.01"
              name={`wodds_${i + 1}`}
              placeholder="$W"
              defaultValue={result.wodds ? result.wodds.toFixed(2) : ""}
              className="col-span-2 p-0 mr-1 border rounded-md text-right"
            />
            
            {/* P-Odds Input (col-span-2) */}
            <input
              type="number"
              step="0.01"
              name={`podds_${i + 1}`}
              placeholder="$P"
              defaultValue={result.podds ? result.podds.toFixed(2) : ""}
              className="col-span-2 p-0 border rounded-md text-right"
            />
          </div>
        ))}
        
      </div>
      {/* --- END Results Grid --- */}

      {/* --- 💡 MODIFICATION: Removed Form Footer --- */}
    </fetcher.Form>
  );
}