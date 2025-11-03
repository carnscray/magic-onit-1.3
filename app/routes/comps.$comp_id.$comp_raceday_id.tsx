// app/routes/comps.$comp_id.$comp_raceday_id.tsx

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";

import { MyTipsSection } from "~/components/MyTipsSection"; 
import { NextToJumpSummary } from "~/components/NextToJumpSummary"; 
import { LeaderboardPoints } from "~/components/LeaderboardPoints"; 
import { LeaderboardOdds } from "~/components/LeaderboardOdds"; 
import { Racecard } from "~/components/Racecard";

import { TipsterHeader } from "../components/TipsterHeader"; 


// --- TYPE DEFINITIONS (UPDATED) ---

// Required for the loader's return type and the component's useLoaderData type
export type RacedayHeaderData = {
    raceday_id: number;
    raceday_name: string;
    raceday_date: string;
    race_count: number;
    racetrack_name: string;
    racetrack_locref: string;
    comp_id: number;
};

// Used for non-finished races to display the full race card (UNCHANGED)
export type RaceRunnerList = {
    runner_no: number;
    runner_name: string;
    runner_barrier: number | null;
    runner_jockey: string | null;
    runner_weight: string | null;
    runner_form: string | null; 
    tipster_count?: number;
}[];

// Defines a unique Sub Tip combination (Main Tip + Alt Tip) (UNCHANGED)
export type SubTipCombo = {
    main_runner_no: number;
    main_runner_name: string;
    alt_runner_no: number;
    alt_runner_name: string;
};


// Full race result including runner names and optional full runner list (UNCHANGED)
export type RaceResultDetail = RaceResultData & {
    runner_1st_name: string | null;
    runner_2nd_name: string | null;
    runner_3rd_name: string | null;
    runner_4th_name: string | null;
    allRunners?: RaceRunnerList; 
    uniqueSubTips?: SubTipCombo[];
};

// Core race result data (UNCHANGED)
export type RaceResultData = {
    race_id: number;
    race_no: number;
    race_notes: string;
    race_1st: number | null;
    race_2nd: number | null;
    race_3rd: number | null;
    race_4th: number | null;
    race_1st_wodds: number | null;
    race_1st_podds: number | null;
    race_2nd_podds: number | null;
    race_3rd_podds: number | null;
};

export type RunnerDetail = {
    runner_no: number; 
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

// 🛑 REPLACED TipsterLeaderboardRow with the unified type
// Defines the shape of a single leaderboard entry, including both points and odds
export type TipsterLeaderboardEntry = {
    tipster_id: number;
    tipster_nickname: string;
    tipster_fullname: string;
    tipster_slogan: string | null;
    tipster_mainpic: string | null;
    points_total: number;       // From points calculation
    odds_total_return: number;  // From odds calculation (NEW)
};


// The combined shape of all data returned by the loader (MODIFIED)
export type RacedayTipsData = {
    racedayHeader: RacedayHeaderData;
    userTips: TipDetail[];
    raceResults: RaceResultDetail[];
    tipsterNickname: string | null; 
    compName: string;
    // 🛑 UPDATED: Single unified leaderboard list
    leaderboard: TipsterLeaderboardEntry[]; 
};


// --- LOADER FUNCTION: FETCHING RACEDAY DETAILS, RACES, AND USER TIPS (MODIFIED) ---
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

    // 2. Fetch the user's tipster ID AND NICKNAME (UNCHANGED)
    const { data: profile, error: profileError } = await supabaseClient
        .from("user_profiles")
        .select("tipster:tipster_id(id, tipster_nickname)")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || !profile.tipster) {
        console.error("Error fetching tipster details:", profileError);
        throw new Response("User profile (tipster details) not found.", { status: 404 });
    }
    
    // Extract both ID and Nickname
    const tipsterId = profile.tipster.id;
    const tipsterNickname = profile.tipster.tipster_nickname;


    // Fetch the Competition Name
    const { data: compDetails, error: compError } = await supabaseClient
        .from("comp")
        .select("comp_name")
        .eq("id", numericCompId)
        .single();
        
    if (compError || !compDetails) {
        console.error("Error fetching competition details:", compError);
        throw new Response("Competition details not found.", { status: 404 });
    }
    const compName = compDetails.comp_name;



    // 3. Get Raceday Header Data & All Race Details (UNCHANGED)
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
        comp_id: numericCompId,
    };

    // Process all races to extract details, results, and odds (UNCHANGED)
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

    // Prepare a map of Race No. to Racecard_Race ID (UNCHANGED)
    const raceIdMap = new Map<number, number>();
    raceData.forEach(race => {
        raceIdMap.set(race.race_no, race.race_id);
    });
    
    // 4. Fetch all tips for the competition on this raceday and aggregate/extract (UNCHANGED)
    const { data: allCompTipsRaw, error: allCompTipsError } = await supabaseClient
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
        .eq("comp_raceday", numericCompRacedayId);
        
    // tipCountMap: Map<RaceNo, Map<RunnerNo, Count>> (for consensus count)
    const tipCountMap = new Map<number, Map<number, number>>(); 
    
    // uniqueSubTipsMap: Map<RaceNo, Set<string of "tip_main,tip_alt">>
    const uniqueSubTipsMap = new Map<number, Set<string>>();


    if (allCompTipsRaw && !allCompTipsError) {
        for (const header of allCompTipsRaw) {
            if (header.tipster_tips_detail) {
                for (const tip of header.tipster_tips_detail) {
                    const raceNo = tip.race_no;
                    
                    if (!tipCountMap.has(raceNo)) {
                        tipCountMap.set(raceNo, new Map<number, number>());
                    }
                    const raceMap = tipCountMap.get(raceNo)!;

                    // 1. Consensus Count Logic (Prioritizing tip_alt)
                    const runnerToCount = tip.tip_alt || tip.tip_main;
                    if (runnerToCount) {
                        raceMap.set(runnerToCount, (raceMap.get(runnerToCount) || 0) + 1);
                    }

                    // 2. Unique Sub Tip Extraction Logic
                    // Only consider a 'Sub' if both main and alt tips exist
                    if (tip.tip_main && tip.tip_alt) {
                        if (!uniqueSubTipsMap.has(raceNo)) {
                            uniqueSubTipsMap.set(raceNo, new Set<string>());
                        }
                        // Store the unique combination as a string key: "main,alt"
                        const comboKey = `${tip.tip_main},${tip.tip_alt}`;
                        uniqueSubTipsMap.get(raceNo)!.add(comboKey);
                    }
                }
            }
        }
    }


    // 5. Build Race Results (UNCHANGED)
    const raceResults: RaceResultDetail[] = await Promise.all(
        raceData.map(async (race) => {
            const hasFinished = race.race_1st !== null;
            let raceRunners: RaceRunnerList | undefined = undefined;
            let uniqueSubTips: SubTipCombo[] | undefined = undefined;

            if (!hasFinished) {
                // Case 1: Race has NOT finished (FETCH ALL RUNNERS, ADD TIP COUNT, and GET UNIQUE SUB TIPS)
                
                // --- A. Fetch Runners and Add Tip Count (UNCHANGED) ---
                const { data: allRunnersData, error: allRunnersError } = await supabaseClient
                    .from("racecard_runner")
                    .select("runner_no, runner_name, runner_barrier, runner_jockey, runner_weight, runner_form") 
                    .eq("racecard_race", race.race_id)
                    .order("runner_no", { ascending: true });

                if (allRunnersData) {
                    const raceTips = tipCountMap.get(race.race_no) || new Map<number, number>();
                    raceRunners = allRunnersData.map(r => ({
                        runner_no: Number(r.runner_no),
                        runner_name: r.runner_name || 'Name N/A',
                        runner_barrier: r.runner_barrier ? Number(r.runner_barrier) : null,
                        runner_jockey: r.runner_jockey || null,
                        runner_weight: r.runner_weight ? String(r.runner_weight) : null,
                        runner_form: r.runner_form || null, 
                        tipster_count: raceTips.get(Number(r.runner_no)) || 0,
                    }));
                }
                
                // --- B. Resolve Unique Sub Tips (UNCHANGED) ---
                const subComboSet = uniqueSubTipsMap.get(race.race_no);
                
                if (subComboSet && subComboSet.size > 0) {
                    const uniqueRunnerNos = new Set<number>();
                    const combosToResolve: { main: number, alt: number }[] = [];
                    
                    for (const comboKey of subComboSet) {
                        const [mainStr, altStr] = comboKey.split(',');
                        const main = Number(mainStr);
                        const alt = Number(altStr);
                        
                        uniqueRunnerNos.add(main);
                        uniqueRunnerNos.add(alt);
                        combosToResolve.push({ main, alt });
                    }

                    // Fetch runner names for all unique runners involved in a sub
                    const { data: subRunnersData, error: subRunnersError } = await supabaseClient
                        .from("racecard_runner")
                        .select("runner_no, runner_name")
                        .eq("racecard_race", race.race_id)
                        .in("runner_no", Array.from(uniqueRunnerNos));
                        
                    if (subRunnersError) {
                        console.error(`Error fetching sub runner names for Race ${race.race_no}:`, subRunnersError);
                    } else if (subRunnersData) {
                        const runnerNameMap = new Map<number, string>();
                        subRunnersData.forEach(r => runnerNameMap.set(Number(r.runner_no), r.runner_name || 'N/A'));
                        
                        uniqueSubTips = combosToResolve.map(combo => ({
                            main_runner_no: combo.main,
                            main_runner_name: runnerNameMap.get(combo.main) || `Runner ${combo.main} N/A`,
                            alt_runner_no: combo.alt,
                            alt_runner_name: runnerNameMap.get(combo.alt) || `Runner ${combo.alt} N/A`,
                        }));
                    }
                }

                
                // Return early for non-finished race, including new data
                return { 
                    ...race, 
                    runner_1st_name: null, 
                    runner_2nd_name: null, 
                    runner_3rd_name: null, 
                    runner_4th_name: null,
                    allRunners: raceRunners,
                    uniqueSubTips: uniqueSubTips,
                };
            }
            
            // Case 2: Race HAS finished (UNCHANGED)
            const runnerNos = [race.race_1st, race.race_2nd, race.race_3rd, race.race_4th].filter((n): n is number => n !== null);
            
            if (runnerNos.length === 0) {
                 return { 
                    ...race, 
                    runner_1st_name: null, 
                    runner_2nd_name: null, 
                    runner_3rd_name: null, 
                    runner_4th_name: null 
                };
            }
            
            // ... (Rest of fetching placed runner names logic remains unchanged)
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

            const getRunnerName = (runnerNo: number | null) => runnerNo ? runnerMap.get(runnerNo) ?? null : null;

            return {
                ...race,
                runner_1st_name: getRunnerName(race.race_1st),
                runner_2nd_name: getRunnerName(race.race_2nd),
                runner_3rd_name: getRunnerName(race.race_3rd),
                runner_4th_name: getRunnerName(race.race_4th),
            };
        })
    );


    // 6. Fetch current user's tips (UNCHANGED)
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

    // 7. Fetch Runner Details for all tips (UNCHANGED)
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


    // 🛑 NEW: 8. Fetch Leaderboard Data using the unified RPC and type
    const { data: combinedLeaderboardData, error: combinedLeaderboardError } = await supabaseClient
        .rpc("get_comp_raceday_leaderboard", {
            comp_raceday_id_in: numericCompRacedayId,
        })
        .returns<TipsterLeaderboardEntry[]>(); // Use the unified type

    // 🛑 UPDATED variable name to 'leaderboard'
    let leaderboard: TipsterLeaderboardEntry[] = [];
    if (combinedLeaderboardError) {
        console.error("Error fetching combined leaderboard data:", combinedLeaderboardError);
        // leaderboard remains []
    } else {
        // Use the fetched data, ensuring it is an array
        leaderboard = combinedLeaderboardData || [];
    }
    
    // 9. Return all data (MODIFIED)
    return json({ 
        racedayHeader, 
        userTips: tipsWithDetails, 
        raceResults, 
        tipsterNickname, 
        compName, 
        leaderboard,
        tipsterId
    } as RacedayTipsData);
};

// --- REACT COMPONENT: DISPLAYING DATA (UPDATED LAYOUT)
export default function RacedayDetail() {
    // 🛑 UPDATED DESTRUCTURING: use the single 'leaderboard' list
    const { racedayHeader, userTips, raceResults, tipsterNickname, compName, leaderboard, tipsterId } = useLoaderData<typeof loader>();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Helper to determine if a race has results
    const hasResults = (race: RaceResultDetail) => {
        return race.race_1st !== null;
    };

    // Find the index of the first race with no result.
    const nextToJumpIndex = raceResults.findIndex(race => !hasResults(race));
    
    
    return (
        <div className="p-2 max-w-xl mx-auto lg:max-w-7xl lg:items-start">
            
            <TipsterHeader nickname={tipsterNickname} />

            {/* --- RACEDAY HEADER (FIXED LAYOUT) --- */}
            <div className="mb-8 p-4 border-b border-gray-200">
                
                <div className="flex items-center space-x-3 mb-2 pl-1">
                    
                    {/* RACEDAY NAME (Now first) */}
                    <p className="text-xl font-heading font-extrabold text-gray-800 leading-none">
                         {racedayHeader.raceday_name} 
                    </p>

                    {/* RIGHT: Large track_locref in a square (Now second) */}
                    <div className="flex-shrink-0 flex items-center justify-center w-12 h-8 
                                  bg-white border-2 border-main "> 
                        <p className="text-lg font-heading font-extrabold text-main uppercase">
                            {racedayHeader.racetrack_locref}
                        </p>
                    </div>
                </div>

                {/* SECONDARY DETAILS (Stacked below) */}
                <div className="flex flex-col space-y-1 pl-1"> 
                    
                    {/* Track Name and Date */}
                    <p className="text-sm font-body text-gray-500 leading-none">
                        {racedayHeader.racetrack_name} - {formatDate(racedayHeader.raceday_date)}
                    </p>

                    {/* Comp Name (LINK) */}
                    <Link 
                        to={`/comps/${racedayHeader.comp_id}`} // Link back to the main competition page
                        className="text-sm underline font-heading text-main hover:text-second transition"
                    >
                         {compName}
                    </Link>
                </div>
            </div>
            
            {/* NEXT TO JUMP AND MY TIPS (Grouped in 2 columns on large screen) */}
            <div className="grid grid-cols-1 gap-16 lg:gap-4 lg:grid-cols-2 h-auto lg:items-start">

                <NextToJumpSummary
                    racedayHeader={racedayHeader}
                    raceResults={raceResults}
                    nextToJumpIndex={nextToJumpIndex}
                />

                <MyTipsSection userTips={userTips} />


            </div>

            {/* --- LEADERBOARDS (Grouped in 2 columns on large screen) --- */}
            <div className="grid grid-cols-1 gap-16 lg:gap-4 lg:grid-cols-2 mt-8 lg:items-start">

                {/* Leaderboard Points 🛑 PASSING THE SINGLE LIST */} 
                <LeaderboardPoints leaderboardData={leaderboard}
                currentTipsterId={tipsterId}
                 />

                {/* Leaderboard Odds 🛑 PASSING THE SINGLE LIST */} 
                <LeaderboardOdds leaderboardData={leaderboard} 
                currentTipsterId={tipsterId}
                />

            </div>


            {/* RACE CARD LIST AND RESULTS SECTION (Full Width) */}
            <Racecard 
                raceResults={raceResults} 
                nextToJumpIndex={nextToJumpIndex} 
            />

        </div>
    );
}