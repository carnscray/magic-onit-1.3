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

// --- TYPE DEFINITIONS (REFACTORED) ---

export type RacedayHeaderData = {
    raceday_id: number;
    raceday_name: string;
    raceday_date: string;
    race_count: number;
    racetrack_name: string;
    racetrack_locref: string;
    comp_id: number;
};

// For "Next to Jump" races (not finished)
export type RaceRunnerList = {
    runner_no: number;
    runner_name: string;
    runner_barrier: number | null;
    runner_jockey: string | null;
    runner_weight: string | null;
    runner_form: string | null; 
    tipster_count?: number;
}[];

// For "Next to Jump" races (not finished)
export type SubTipCombo = {
    main_runner_no: number;
    main_runner_name: string;
    alt_runner_no: number;
    alt_runner_name: string;
};

// NEW: For "Finished" races
export type PlacedRunner = {
    id: number;
    runner_no: number;
    position: number;
    wodds: number | null;
    podds: number | null;
    runner_name: string; // Joined from racecard_runner
};

// REFACTORED: This is the new, combined shape for a race
export type RaceResultDetail = {
    race_id: number;
    race_no: number;
    race_notes: string;
    
    // One of these two will be populated
    results: PlacedRunner[];       // For finished races
    allRunners?: RaceRunnerList;   // For "Next to Jump"
    uniqueSubTips?: SubTipCombo[]; // For "Next to Jump"
};

// This type is no longer used for race results
// export type RaceResultData = { ... };

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

export type TipsterLeaderboardEntry = {
    tipster_id: number;
    tipster_nickname: string;
    tipster_fullname: string;
    tipster_slogan: string | null;
    tipster_mainpic: string | null;
    points_total: number;
    odds_total_return: number;
};

// REFACTORED: Combined loader data shape
export type RacedayTipsData = {
    racedayHeader: RacedayHeaderData;
    userTips: TipDetail[];
    raceResults: RaceResultDetail[]; // This uses the new type
    tipsterNickname: string | null; 
    compName: string;
    leaderboard: TipsterLeaderboardEntry[]; 
    tipsterId: number; // Added tipsterId (was missing from your type)
};

// --- LOADER FUNCTION (REFACTORED) ---
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    const { supabaseClient, headers } = createSupabaseServerClient(request);
    
    // 1. Auth check and parameter validation 
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
        return redirect("/auth", { headers });
    }

    const compId = params.comp_id;
    const compRacedayId = params.comp_raceday_id;
    if (!compRacedayId || isNaN(Number(compRacedayId)) || !compId || isNaN(Number(compId))) {
        throw new Response("Invalid ID format", { status: 400, headers });
    }
    const numericCompRacedayId = Number(compRacedayId);
    const numericCompId = Number(compId);
    
    // 2. Fetch the user's tipster ID AND NICKNAME 
    const { data: profile, error: profileError } = await supabaseClient
        .from("user_profiles")
        .select("tipster:tipster_id(id, tipster_nickname)")
        .eq("id", user.id)
        .single();
        
    if (profileError || !profile || !profile.tipster) {
        console.error("Error fetching tipster details:", profileError);
        throw new Response("User profile (tipster details) not found.", { status: 404, headers });
    }
    
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
        throw new Response("Competition details not found.", { status: 404, headers });
    }
    const compName = compDetails.comp_name;

    // 3. Get Raceday Header Data & All Race Details 
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
                    race_notes
                )
            )
            `
        ) // <-- REFACTORED: Removed old race_1st, etc. columns
        .eq("id", numericCompRacedayId)
        .maybeSingle();

    if (racedayError || !compRacedayData || !compRacedayData.racecard_day || compRacedayData.comp !== numericCompId) {
        console.error("Error fetching raceday header or Comp ID mismatch:", racedayError);
        throw new Response("Raceday not found or access denied", { status: 404, headers });
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

    // Process all races to extract basic details
    const rawRaces = day.racecard_race || [];
    // This is now just the base race info
    const raceData = rawRaces
        .map(race => ({
            race_id: race.id,
            race_no: Number(race.race_no),
            race_notes: race.race_notes || '',
        }))
        .sort((a, b) => a.race_no - b.race_no);

    // Prepare a map of Race No. to Racecard_Race ID 
    const raceIdMap = new Map<number, number>();
    raceData.forEach(race => {
        raceIdMap.set(race.race_no, race.race_id);
    });

    // 4. Fetch all tips for the competition on this raceday (for Next To Jump)
    const { data: allCompTipsRaw, error: allCompTipsError } = await supabaseClient
        .from("tipster_tips_header")
        .select(`
            tipster_tips_detail (
                race_no,
                tip_main,
                tip_alt
            )
        `)
        .eq("comp_raceday", numericCompRacedayId);

    const tipCountMap = new Map<number, Map<number, number>>();
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
                    
                    const runnerToCount = tip.tip_alt || tip.tip_main;
                    if (runnerToCount) {
                        raceMap.set(runnerToCount, (raceMap.get(runnerToCount) || 0) + 1);
                    }

                    if (tip.tip_main && tip.tip_alt) {
                        if (!uniqueSubTipsMap.has(raceNo)) {
                            uniqueSubTipsMap.set(raceNo, new Set<string>());
                        }
                        const comboKey = `${tip.tip_main},${tip.tip_alt}`;
                        uniqueSubTipsMap.get(raceNo)!.add(comboKey);
                    }
                }
            }
        }
    }


    // 5. Build Race Results (REFACTORED)
    const raceResults: RaceResultDetail[] = await Promise.all(
        raceData.map(async (race) => {
            
            // Check for results in the new table
            const { data: results, error: resultsError } = await supabaseClient
                .from("racecard_race_results")
                .select("id, runner_no, position, wodds, podds")
                .eq("racecard_race_id", race.race_id)
                .order("position");

            const hasFinished = results && results.length > 0;

            if (hasFinished) {
                // Case 1: Race HAS finished. Fetch runner names for the results.
                const runnerNos = results.map(r => r.runner_no);
                
                const { data: runners, error: runnerError } = await supabaseClient
                    .from("racecard_runner")
                    .select("runner_no, runner_name")
                    .eq("racecard_race", race.race_id)
                    .in("runner_no", runnerNos);

                const runnerMap = new Map<number, string>();
                if (runners) {
                    runners.forEach(r => runnerMap.set(Number(r.runner_no), r.runner_name || 'N/A'));
                }

                const finalResults: PlacedRunner[] = results.map(r => ({
                    ...r,
                    wodds: r.wodds ? Number(r.wodds) : null,
                    podds: r.podds ? Number(r.podds) : null,
                    runner_name: runnerMap.get(r.runner_no) ?? 'Name N/A'
                }));

                return { 
                    ...race, 
                    results: finalResults,
                    allRunners: undefined, // No need for full runner list
                    uniqueSubTips: undefined,
                };
            }
            
            // Case 2: Race has NOT finished. 
            // Run the "Next to Jump" logic as before.
            let raceRunners: RaceRunnerList | undefined = undefined;
            let uniqueSubTips: SubTipCombo[] | undefined = undefined;

            // --- A. Fetch Runners and Add Tip Count ---
            const { data: allRunnersData } = await supabaseClient
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
            
            // --- B. Resolve Unique Sub Tips ---
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

                const { data: subRunnersData } = await supabaseClient
                    .from("racecard_runner")
                    .select("runner_no, runner_name")
                    .eq("racecard_race", race.race_id)
                    .in("runner_no", Array.from(uniqueRunnerNos));

                if (subRunnersData) {
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
            
            // Return for non-finished race
            return { 
                ...race, 
                results: [], // Empty results array
                allRunners: raceRunners,
                uniqueSubTips: uniqueSubTips,
            };
        })
    );
    // --- END REFACTORED STEP 5 ---


// 6. Fetch current user's tips 
    const { data: userTipsRaw } = await supabaseClient
        .from("tipster_tips_header")
        .select(`
            tipster_tips_detail (
                race_no,
                tip_main,
                tip_alt
            )
        `)
        .eq("tipster", tipsterId)
        .eq("comp_raceday", numericCompRacedayId)
        .maybeSingle();
        
    let userTipsRawData: Omit<TipDetail, 'tip_main_details' | 'tip_alt_details'>[] = [];

    // --- MODIFICATION: Fixed typo 'tipter_tips_detail' -> 'tipster_tips_detail' ---
    if (userTipsRaw && userTipsRaw.tipster_tips_detail) {
        userTipsRawData = userTipsRaw.tipster_tips_detail.map(tip => ({
            race_no: tip.race_no,
            tip_main: tip.tip_main,
            tip_alt: tip.tip_alt,
        }));
    }


    userTipsRawData.sort((a, b) => a.race_no - b.race_no);

    // 7. Fetch Runner Details for all tips (Unchanged)
    const tipsWithDetails: TipDetail[] = await Promise.all(userTipsRawData.map(async (tip) => {
        const racecardRaceId = raceIdMap.get(Number(tip.race_no));
        if (!racecardRaceId) {
            return { ...tip, tip_main_details: null, tip_alt_details: null } as TipDetail;
        }
        const runnerNos = [tip.tip_main, ...(tip.tip_alt ? [tip.tip_alt] : [])];
        const { data: runners } = await supabaseClient
            .from("racecard_runner")
            .select("runner_no, runner_name, runner_jockey")
            .eq("racecard_race", racecardRaceId)
            .in("runner_no", runnerNos);

        if (!runners) {
            return { ...tip, tip_main_details: null, tip_alt_details: null } as TipDetail;
        }

        const runnerMap = new Map<number, RunnerDetail>();
        runners.forEach(r => {
            runnerMap.set(Number(r.runner_no), {
                runner_no: Number(r.runner_no),
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
    
    // 8. Fetch Leaderboard Data (Unchanged)
    const { data: combinedLeaderboardData, error: combinedLeaderboardError } = await supabaseClient
        .rpc("get_comp_raceday_leaderboard", {
            comp_raceday_id_in: numericCompRacedayId,
        })
        .returns<TipsterLeaderboardEntry[]>();

    let leaderboard: TipsterLeaderboardEntry[] = [];
    if (combinedLeaderboardError) {
        console.error("Error fetching combined leaderboard data:", combinedLeaderboardError);
    } else {
        leaderboard = combinedLeaderboardData || [];
    }
    
    // 9. Return all data 
    return json({ 
        racedayHeader, 
        userTips: tipsWithDetails, 
        raceResults, 
        tipsterNickname, 
        compName, 
        leaderboard,
        tipsterId // Pass tipsterId for leaderboard
    } as RacedayTipsData, { headers });
};

// --- REACT COMPONENT: DISPLAYING DATA (REFACTORED) ---
export default function RacedayDetail() {
    const { racedayHeader, userTips, raceResults, tipsterNickname, compName, leaderboard, tipsterId } = useLoaderData<typeof loader>();
    
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Helper to determine if a race has results
    // --- MODIFIED: Check the 'results' array length ---
    const hasResults = (race: RaceResultDetail) => {
        return race.results && race.results.length > 0;
    };
    // --- END MODIFICATION ---

    // Find the index of the first race with no result.
    const nextToJumpIndex = raceResults.findIndex(race => !hasResults(race));
    
    return (
        <div className="p-2 max-w-xl mx-auto lg:max-w-7xl lg:items-start">
            
            <TipsterHeader nickname={tipsterNickname} />

            {/* --- RACEDAY HEADER (FINAL FIXED LAYOUT) --- */}
            <div className="mb-8 p-4 border-b border-gray-200">
                
                <p className="text-3xl font-heading font-extrabold text-main mb-3 pb-1 pl-1 leading-none">
                    {racedayHeader.raceday_name} 
                </p>

                

                <div className="flex items-center pl-1 space-x-3"> 
                    
                    <div className="flex-shrink-0 flex items-center justify-center min-w-[3rem] 
                                bg-white border-2 border-main "> 
                        <p className="text-lg font-heading font-extrabold text-main uppercase py-2.5 px-2">
                            {racedayHeader.racetrack_locref}
                        </p>
                    </div>

                    <div className="flex flex-col space-y-0.5"> 
                        
                        <p className="text-md font-body text-blackmain leading-none">
                            {racedayHeader.racetrack_name} - {formatDate(racedayHeader.raceday_date)}
                        </p>

                        <Link 
                            to={`/comps/${racedayHeader.comp_id}`} 
                            className="text-md underline font-heading text-main hover:text-alt transition"
                        >
                            {compName}
                        </Link>
                    </div>
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

                <LeaderboardPoints leaderboardData={leaderboard}
                currentTipsterId={tipsterId}
                 />

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