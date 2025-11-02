import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";

// --- TYPE DEFINITIONS ---

export type RacedayHeaderData = {
    raceday_id: number; // racecard_day.id
    raceday_name: string;
    raceday_date: string;
    race_count: number;
    racetrack_name: string;
    racetrack_locref: string;
};

// 💡 UPDATED TYPE: Added runner_form
export type RaceRunnerList = {
    runner_no: number;
    runner_name: string;
    runner_barrier: number | null;
    runner_jockey: string | null;
    runner_weight: string | null; 
    runner_form: string | null; // <-- ADDED
}[];

// 💡 NEW TYPE: Race result and odds data from racecard_race (UNCHANGED)
export type RaceResultData = {
    race_id: number; // racecard_race.id
    race_no: number;
    race_notes: string;
    // Results - runner_no references
    race_1st: number | null;
    race_2nd: number | null;
    race_3rd: number | null;
    race_4th: number | null;
    // Odds (numeric from DB, handled as number in TS)
    race_1st_wodds: number | null;
    race_1st_podds: number | null;
    race_2nd_podds: number | null;
    race_3rd_podds: number | null;
};

export type RunnerDetail = {
    runner_no: number; // Added runner_no here for easier mapping
    runner_name: string;
    runner_jockey: string;
} | null;

export type TipDetail = {
    race_no: number;
    tip_main: number;
    tip_alt: number | null;
    tip_main_details: RunnerDetail;
    tip_alt_details: RunnerDetail;
};

// 💡 UPDATED TYPE: Add result details for the top 4 and the full runner list
export type RaceResultDetail = RaceResultData & {
    runner_1st_name: string | null;
    runner_2nd_name: string | null;
    runner_3rd_name: string | null;
    runner_4th_name: string | null;
    // 💡 NEW FIELD: Full runner list for non-result races
    allRunners?: RaceRunnerList; 
};

// 💡 UPDATED TYPE: Change 'races' to 'raceResults' to reflect new structure
export type RacedayTipsData = {
    racedayHeader: RacedayHeaderData;
    userTips: TipDetail[];
    raceResults: RaceResultDetail[]; // Now contains full details
};

// --- LOADER FUNCTION: FETCHING RACEDAY DETAILS, RACES, AND USER TIPS ---
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    const { supabaseClient } = createSupabaseServerClient(request);

    // 1. Auth check and parameter validation (UNCHANGED)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        return redirect("/auth");
    }

    const compId = params.comp_id;
    const compRacedayId = params.comp_raceday_id;

    if (!compRacedayId || isNaN(Number(compRacedayId)) || !compId || isNaN(Number(compId))) {
        throw new Response("Invalid ID format", { status: 400 });
    }
    const numericCompRacedayId = Number(compRacedayId);
    const numericCompId = Number(compId);

    // 2. Fetch the user's tipster ID (UNCHANGED)
    const { data: profile, error: profileError } = await supabaseClient
        .from("user_profiles")
        .select("tipster_id")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        console.error("Error fetching tipster ID:", profileError);
        throw new Response("User profile (tipster_id) not found.", { status: 404 });
    }
    const tipsterId = profile.tipster_id;


    // 3. Get Raceday Header Data & All Race Details (UNCHANGED SELECT)
    const { data: compRacedayData, error: racedayError } = await supabaseClient
        .from("comp_raceday")
        .select(
            `
            id,
            comp,
            racecard_day (
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
                    race_1st,
                    race_2nd,
                    race_3rd,
                    race_4th,
                    race_1st_wodds,
                    race_1st_podds,
                    race_2nd_podds,
                    race_3rd_podds
                )
            )
            `
        )
        .eq("id", numericCompRacedayId)
        .maybeSingle();

    if (racedayError || !compRacedayData || !compRacedayData.racecard_day || compRacedayData.comp !== numericCompId) {
        console.error("Error fetching raceday header or Comp ID mismatch:", racedayError);
        throw new Response("Raceday not found or access denied", { status: 404 });
    }

    const day = compRacedayData.racecard_day;
    const racedayHeader: RacedayHeaderData = {
        raceday_id: day.id,
        raceday_name: day.racecard_name ?? 'N/A',
        raceday_date: day.racecard_date ?? 'N/A',
        race_count: day.racecard_race.length,
        racetrack_name: day.racetrack?.track_name ?? 'N/A',
        racetrack_locref: day.racetrack?.track_locref ?? 'N/A',
    };

    // Process all races to extract details, results, and odds
    const rawRaces = day.racecard_race || [];

    const raceData: RaceResultData[] = rawRaces
        .map(race => ({
            race_id: race.id,
            race_no: Number(race.race_no),
            race_notes: race.race_notes || '',
            
            // FIX: Use != null to ensure the number 0 is NOT converted to null.
            race_1st: race.race_1st != null ? Number(race.race_1st) : null,
            race_2nd: race.race_2nd != null ? Number(race.race_2nd) : null,
            race_3rd: race.race_3rd != null ? Number(race.race_3rd) : null,
            race_4th: race.race_4th != null ? Number(race.race_4th) : null,
            
            race_1st_wodds: race.race_1st_wodds != null ? Number(race.race_1st_wodds) : null,
            race_1st_podds: race.race_1st_podds != null ? Number(race.race_1st_podds) : null,
            race_2nd_podds: race.race_2nd_podds != null ? Number(race.race_2nd_podds) : null,
            race_3rd_podds: race.race_3rd_podds != null ? Number(race.race_3rd_podds) : null,
        }))
        .sort((a, b) => a.race_no - b.race_no); // Ensure races are sorted

    // Prepare a map of Race No. to Racecard_Race ID
    const raceIdMap = new Map<number, number>();
    raceData.forEach(race => {
        raceIdMap.set(race.race_no, race.race_id);
    });

    // 💡 MODIFIED LOGIC: Fetch runner names for all placed horses AND all runners for non-result races
    const raceResults: RaceResultDetail[] = await Promise.all(
        raceData.map(async (race) => {
            const hasFinished = race.race_1st !== null;
            let raceRunners: RaceRunnerList | undefined = undefined;
            
            if (!hasFinished) {
                // Case 1: Race has NOT finished (FETCH ALL RUNNERS with updated fields)
                const { data: allRunnersData, error: allRunnersError } = await supabaseClient
                    .from("racecard_runner")
                    // 🛠️ UPDATED SELECT: Added runner_form
                    .select("runner_no, runner_name, runner_barrier, runner_jockey, runner_weight, runner_form") 
                    .eq("racecard_race", race.race_id)
                    .order("runner_no", { ascending: true }); // Order by number

                if (allRunnersError) {
                    console.error(`Error fetching all runners for Race ${race.race_no}:`, allRunnersError);
                } else if (allRunnersData) {
                    raceRunners = allRunnersData.map(r => {
                        // 🛠️ UPDATED: Keep runner_weight as raw string/text
                        const rawWeight = r.runner_weight ? String(r.runner_weight) : null;

                        return {
                            runner_no: Number(r.runner_no),
                            runner_name: r.runner_name || 'Name N/A',
                            runner_barrier: r.runner_barrier ? Number(r.runner_barrier) : null,
                            runner_jockey: r.runner_jockey || null,
                            runner_weight: rawWeight, // Use the raw weight string
                            runner_form: r.runner_form || null, // <-- ADDED
                        };
                    });
                }
                
                // Return early for non-finished race, only need allRunners
                return { 
                    ...race, 
                    runner_1st_name: null, 
                    runner_2nd_name: null, 
                    runner_3rd_name: null, 
                    runner_4th_name: null,
                    allRunners: raceRunners // Include the full list
                };
            }
            
            // Case 2: Race HAS finished (FETCH PLACED RUNNER NAMES - Existing Logic)
            const runnerNos = [race.race_1st, race.race_2nd, race.race_3rd, race.race_4th].filter((n): n is number => n !== null);
            
            if (runnerNos.length === 0) {
                // If results are null/zeroed, return with null names
                 return { 
                    ...race, 
                    runner_1st_name: null, 
                    runner_2nd_name: null, 
                    runner_3rd_name: null, 
                    runner_4th_name: null 
                };
            }

            const { data: runners, error: runnerError } = await supabaseClient
                .from("racecard_runner")
                .select("runner_no, runner_name")
                .eq("racecard_race", race.race_id)
                .in("runner_no", runnerNos);

            if (runnerError) {
                console.error(`Error fetching placed runners for Race ${race.race_no}:`, runnerError);
                return { 
                    ...race, 
                    runner_1st_name: null, 
                    runner_2nd_name: null, 
                    runner_3rd_name: null, 
                    runner_4th_name: null 
                };
            }

            const runnerMap = new Map<number, string>();
            runners.forEach(r => {
                runnerMap.set(Number(r.runner_no), r.runner_name || 'Name N/A');
            });

            // Map runner numbers to names
            const getRunnerName = (runnerNo: number | null) => runnerNo ? runnerMap.get(runnerNo) ?? null : null;

            return {
                ...race,
                runner_1st_name: getRunnerName(race.race_1st),
                runner_2nd_name: getRunnerName(race.race_2nd),
                runner_3rd_name: getRunnerName(race.race_3rd),
                runner_4th_name: getRunnerName(race.race_4th),
                // allRunners remains undefined here, which is fine
            };
        })
    );


    // 4. Fetch current user's tips (UNCHANGED)
    const { data: userTipsRaw, error: tipsError } = await supabaseClient
        .from("tipster_tips_header")
        .select(
            `
            tipster_tips_detail (
                race_no,
                tip_main,
                tip_alt
            )
            `
        )
        .eq("tipster", tipsterId)
        .eq("comp_raceday", numericCompRacedayId)
        .maybeSingle();

    let userTipsRawData: Omit<TipDetail, 'tip_main_details' | 'tip_alt_details'>[] = [];

    if (userTipsRaw && userTipsRaw.tipster_tips_detail) {
        userTipsRawData = userTipsRaw.tipster_tips_detail.map(tip => ({
            race_no: tip.race_no,
            tip_main: tip.tip_main,
            tip_alt: tip.tip_alt,
        }));
    }

    userTipsRawData.sort((a, b) => a.race_no - b.race_no);

    // 5. Fetch Runner Details for all tips (UNCHANGED logic)
    const tipsWithDetails: TipDetail[] = await Promise.all(userTipsRawData.map(async (tip) => {
        const racecardRaceId = raceIdMap.get(Number(tip.race_no));

        if (!racecardRaceId) {
            return { ...tip, tip_main_details: null, tip_alt_details: null } as TipDetail;
        }

        const runnerNos = [tip.tip_main, ...(tip.tip_alt ? [tip.tip_alt] : [])];

        const { data: runners, error: runnerError } = await supabaseClient
            .from("racecard_runner")
            .select("runner_no, runner_name, runner_jockey")
            .eq("racecard_race", racecardRaceId)
            .in("runner_no", runnerNos);

        if (runnerError) {
            console.error(`Error fetching runners for Race ${tip.race_no}:`, runnerError);
            return { ...tip, tip_main_details: null, tip_alt_details: null } as TipDetail;
        }

        const runnerMap = new Map<number, RunnerDetail>();
        runners.forEach(r => {
            runnerMap.set(Number(r.runner_no), {
                runner_no: Number(r.runner_no), // Explicitly set runner_no
                runner_name: r.runner_name || 'N/A',
                runner_jockey: r.runner_jockey || 'N/A',
            });
        });

        return {
            ...tip,
            tip_main_details: runnerMap.get(Number(tip.tip_main)) || null,
            tip_alt_details: tip.tip_alt ? runnerMap.get(Number(tip.tip_alt)) || null : null,
        } as TipDetail;
    }));


    // 6. Return all data, using raceResults
    return json({ racedayHeader, userTips: tipsWithDetails, raceResults } as RacedayTipsData);
};


// --- REACT COMPONENT: DISPLAYING DATA ---
export default function RacedayDetail() {
    const { racedayHeader, userTips, raceResults } = useLoaderData<typeof loader>();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Helper to format odds (e.g., 5.5 to $5.50).
    const formatOdds = (odds: number | null): string => {
        if (odds === null) return "N/A";
        // ToFixed(2) handles both standard odds and 0 (for $0.00)
        return `$${odds.toFixed(2)}`;
    };

    // Helper to determine if a race has results
    const hasResults = (race: RaceResultDetail) => {
        return race.race_1st !== null;
    };

    // 💡 NEW HELPER FUNCTION: Get the last 5 characters of the form string.
    const getFormSlice = (form: string | null): string => {
        if (!form) return '';
        // Takes the last 5 characters. If less than 5, takes all.
        return form.slice(-5);
    };

    // Find the index of the first race with no result.
    const nextToJumpIndex = raceResults.findIndex(race => !hasResults(race));
    
    // Renders a single, aligned results row (UNCHANGED)
    const ResultsRow = ({
        place, 
        runnerNo, 
        runnerName, 
        wOdds, 
        pOdds,
        isFirst,
        isLast
    }: {
        place: number, 
        runnerNo: number | null, 
        runnerName: string | null, 
        wOdds?: number | null, 
        pOdds: number | null,
        isFirst: boolean,
        isLast: boolean
    }) => {
        // Place text is uppercase
        const placeText = place === 1 ? '1ST' : place === 2 ? '2ND' : place === 3 ? '3RD' : '4TH';
        
        const rowClasses = isFirst 
            ? 'bg-green-50 border-b border-green-200' 
            : isLast 
                ? '' 
                : 'border-b border-gray-100';

        // Runner No is right-justified with a dot
        const runnerNoDisplay = runnerNo !== null ? `${runnerNo}.` : '??.';
        const runnerNameDisplay = runnerName ?? 'Name N/A';
        
        // Grid columns using a 12-column system
        return (
            <div className={`grid grid-cols-12 items-center py-1 px-1 ${rowClasses}`}>
                
                {/* 1. Position Text - Left Aligned */}
                <p className={`col-span-1 text-sm font-bold ${isFirst ? 'text-green-600' : 'text-gray-600'} text-left`}>
                    {placeText}
                </p>
                
                {/* 2. Runner No - Right Aligned, Bold. */}
                <p className="col-span-2 text-lg font-extrabold text-gray-800 text-right">
                    {runnerNoDisplay}
                </p>

                {/* 3. Runner Name - Left Aligned, Truncated/Faded */}
                <p className={`col-span-5 text-sm font-medium text-gray-700 truncate text-left ml-2`}>
                    {runnerNameDisplay}
                </p>

                {/* 4. W Odds (Only for 1ST place) / Empty Placeholder for 2ND, 3RD, 4TH */}
                <div className="col-span-2 flex justify-end text-sm text-gray-500 leading-tight">
                    {isFirst && (
                        <span className="text-sm">{formatOdds(wOdds)}</span>
                    )}
                </div>

                {/* 5. P Odds (Final Column) */}
                <div className={`col-span-2 flex justify-end text-sm text-gray-500 leading-tight`}>
                    {pOdds !== null && (
                        <span className="text-sm">{formatOdds(pOdds)}</span>
                    )}
                    {/* 4TH place is blank because pOdds is explicitly passed as null */}
                </div>
            </div>
        );
    }


    return (
        <div className="p-8 max-w-xl mx-auto lg:max-w-7xl">

            {/* --- RACEDAY HEADER (UNCHANGED) --- */}
            <div className="mb-8 border-b pb-4">
                <p className="text-xl font-heading font-extrabold text-gray-800">
                    {racedayHeader.raceday_name} ({racedayHeader.racetrack_locref})
                </p>
                <p className="text-sm font-body text-gray-500">
                    {racedayHeader.racetrack_name} - {formatDate(racedayHeader.raceday_date)}
                </p>
            </div>
            {/* ------------------------------------------------------------------ */}

            {/* 🏁 RACE LIST AND RESULTS SECTION 🏁 */}

            <div className="flex items-center space-x-3 mb-4 mt-10">
                <span className="material-symbols-outlined text-3xl text-gray-800">
                    sports_score
                </span>

                <h2 className="text-2xl font-heading font-semibold text-gray-800">
                    Racecard
                </h2>
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-500 text-white text-base font-bold shadow-md flex-shrink-0">
                    {raceResults.length}
                </span>
            </div>

            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-10">
                {raceResults.map((race, index) => {
                    
                    let statusText: 'RESULT' | 'NEXT TO JUMP' | null = null;
                    let statusClasses = '';
                    
                    if (hasResults(race)) {
                        statusText = 'RESULT';
                        statusClasses = 'bg-green-100 text-green-800';
                    } else if (index === nextToJumpIndex && index !== -1) {
                        statusText = 'NEXT TO JUMP';
                        statusClasses = 'bg-pink-100 text-pink-800'; // Distinct color for next race
                    }

                    return (
                        <li
                            key={index}
                            className="p-4 bg-white shadow-lg rounded-lg border border-gray-100"
                        >
                            <div className="flex flex-col space-y-3">
                                {/* Race Number and Status on a single line. Race Notes removed. */}
                                <div className="flex items-center justify-between border-b pb-2">
                                    <div className="flex items-center space-x-2">
                                        {/* 💡 MODIFIED: 'Race' is slightly larger */}
                                        <span className="text-sm font-heading font-semibold text-gray-500 uppercase">RACE</span>
                                        <span className="text-2xl font-heading font-extrabold text-indigo-600">
                                            {race.race_no}
                                        </span>
                                    </div>
                                    {/* Status Indicator (Conditional) */}
                                    {statusText && (
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusClasses}`}>
                                            {statusText}
                                        </span>
                                    )}
                                </div>

                                {/* Conditional Display: Results vs. Full Race Card */}
                                {hasResults(race) ? (
                                    // **1. DISPLAY RESULTS (UNCHANGED)**
                                    <div className="pt-1">
                                        
                                        {/* 1ST PLACE ROW */}
                                        <ResultsRow
                                            place={1}
                                            runnerNo={race.race_1st}
                                            runnerName={race.runner_1st_name}
                                            wOdds={race.race_1st_wodds}
                                            pOdds={race.race_1st_podds}
                                            isFirst={true}
                                            isLast={false}
                                        />
                                        
                                        {/* 2ND PLACE ROW */}
                                        <ResultsRow
                                            place={2}
                                            runnerNo={race.race_2nd}
                                            runnerName={race.runner_2nd_name}
                                            pOdds={race.race_2nd_podds}
                                            isFirst={false}
                                            isLast={false}
                                        />

                                        {/* 3RD PLACE ROW */}
                                        <ResultsRow
                                            place={3}
                                            runnerNo={race.race_3rd}
                                            runnerName={race.runner_3rd_name}
                                            pOdds={race.race_3rd_podds}
                                            isFirst={false}
                                            isLast={false}
                                        />
                                        
                                        {/* 4TH PLACE ROW */}
                                        <ResultsRow
                                            place={4}
                                            runnerNo={race.race_4th}
                                            runnerName={race.runner_4th_name}
                                            pOdds={null} // 4TH place has no odds
                                            isFirst={false}
                                            isLast={true}
                                        /> 

                                    </div>
                                ) : (
                                    // **2. DISPLAY FULL RUNNER LIST (UPDATED)**
                                    <div className="pt-1">
                                        
                                        {/* 🛠️ UPDATED Column Labels: 3 (No. Form) + 5 (Runner/Weight) + 4 (Jockey) */}
                                        {/*
                                        {/*<div className="grid grid-cols-12 text-xs font-semibold uppercase text-gray-500 border-b pb-1 mb-1">
                                        {/*    {/* NEW COLUMN: No. + Form (col-span-3) */}
                                        {/*    <div className="col-span-3">No. Form</div> 
                                        {/*   
                                        {/*    {/* ADJUSTED COLUMN SPAN: Runner/Weight (col-span-5) */}
                                        {/*    <div className="col-span-5">Runner (Barrier) Weight</div>
                                        {/*   
                                        {/*    {/* JOCKEY - (col-span-4), right-justified */}
                                        {/*    <div className="col-span-4 text-right">Jockey</div>
                                        {/*</div>
                                        */}

                                        <div className="space-y-1"> 
                                            {race.allRunners?.map((runner) => (
                                                <div key={runner.runner_no} className="grid grid-cols-12 items-center text-sm border-b border-gray-100 last:border-b-0 py-0.5">
                                                    
                                                    {/* 1. RUNNER NO. + FORM - col-span-3. Left aligned block */}
                                                    <div className="col-span-2 font-medium text-gray-800 pr-1">
                                                        {/* Runner No. (Prominent) */}
                                                        <span className="font-extrabold text-indigo-600 mr-1 text-sm">
                                                            {runner.runner_no}.
                                                        </span>
                                                        
                                                        {/* Form (Right justified within this block, smaller text) */}
                                                        <span className="inline-block float-right text-gray-500 text-xs font-medium ">
                                                            {getFormSlice(runner.runner_form)}
                                                        </span>
                                                    </div>

                                                    {/* 2. RUNNER NAME + BARRIER + WEIGHT - col-span-5 */}
                                                    <div className="col-span-6 font-medium text-gray-800 truncate pl-1 pr-2">
                                                        
                                                        {/* Runner Name */}
                                                        {runner.runner_name} 
                                                        
                                                        {/* Barrier (Smaller text) */}
                                                        <span className="text-gray-500 font-normal ml-1 text-xs">
                                                            ({runner.runner_barrier !== null ? runner.runner_barrier : 'Scr'})
                                                        </span>
                                                        
                                                        {/* Weight (Raw Text) (Smaller text) */}
                                                        <span className="text-gray-700 font-normal ml-2 text-xs">
                                                            {runner.runner_weight || ''}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* 3. JOCKEY - 4/12 (Final Column) - Right-justified, smaller text (UNCHANGED) */}
                                                    <div className="col-span-4 text-gray-700 text-xs truncate text-right pr-1">
                                                        {runner.runner_jockey || 'N/A'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Handle case where race has no results and no runners found */}
                                        {(!race.allRunners || race.allRunners.length === 0) && (
                                            <p className="text-sm italic text-gray-400 p-2">
                                                No runner data available for this race.
                                            </p>
                                        )}
                                    </div>
                                )}

                            </div>
                        </li>
                    );
                })}
            </ul>

            {/* --- USER TIPS SECTION (UNCHANGED) --- */}
            
            <div className="flex items-center space-x-3 mb-4 mt-10">
                <span className="material-symbols-outlined text-3xl text-gray-800">
                    Checkbook
                </span>

                <h2 className="text-2xl font-heading font-semibold text-gray-800">
                    My Tips
                </h2>
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-green-500 text-white text-base font-bold shadow-md flex-shrink-0">
                    {userTips.length}
                </span>
            </div>

            {userTips.length === 0 ? (
                <p className="text-gray-500 italic font-body mb-8 p-4 bg-gray-50 rounded-lg">
                    You have not submitted any tips for this raceday yet.
                </p>
            ) : (
                <div className="mb-10 shadow-lg rounded-lg border border-gray-100 overflow-hidden">
                    
                    {/* Table Header - Now 2 columns (RACE: 2/12, SELECTION: 10/12) */}
                    <div className="grid grid-cols-12 text-xs font-semibold uppercase text-gray-500 bg-gray-50 p-3 border-b border-gray-100">
                        <div className="col-span-2 text-left">RACE</div>
                        <div className="col-span-10 text-left">SELECTION</div>
                    </div>

                    {/* Tip Rows */}
                    {userTips.map((tip, index) => {
                        
                        // Main Runner details
                        const mainRunnerNo = tip.tip_main;
                        const mainRunnerName = tip.tip_main_details?.runner_name || 'Name N/A';
                        
                        // Start with the main tip display
                        let combinedRunnerDisplay = `${mainRunnerNo}. ${mainRunnerName}`;
                        
                        // Alt Runner (SUB) details
                        const altRunnerNo = tip.tip_alt;
                        const altRunnerName = tip.tip_alt_details?.runner_name || 'Name N/A';
                        
                        // 💡 NEW LOGIC: Append SUB tip if it exists
                        if (altRunnerNo) {
                            combinedRunnerDisplay += ` > SUB: ${altRunnerNo}. ${altRunnerName}`;
                        }

                        return (
                            <div
                                key={index}
                                className="grid grid-cols-12 items-center text-sm p-3 border-b last:border-b-0 hover:bg-gray-50 transition duration-100"
                            >
                                {/* 1. RACE - 2/12 width */}
                                <div className="col-span-2 text-lg font-extrabold text-indigo-600">
                                    {tip.race_no}
                                </div>
                                
                                {/* 2. RUNNER (Combined Tip) - 10/12 width */}
                                <div className="col-span-10 text-gray-800 font-medium truncate">
                                    {combinedRunnerDisplay}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}