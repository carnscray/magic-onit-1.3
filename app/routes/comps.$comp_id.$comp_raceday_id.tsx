// app/routes/comps.$comp_id.$comp_raceday_id.tsx

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link, Outlet, useFetcher } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";

import { MyTipsSection } from "~/components/MyTipsSection";
import { NextToJumpSummary } from "~/components/NextToJumpSummary";
import { LeaderboardPoints } from "~/components/LeaderboardPoints";
import { LeaderboardOdds } from "~/components/LeaderboardOdds";
import { Racecard } from "~/components/Racecard";
import { TipsterAllTips } from "~/components/TipsterAllTips"; 

// --- TYPE DEFINITIONS (SPLIT) ---

// ... (existing RacedayHeaderData, RaceRunnerList, SubTipCombo, PlacedRunner, RunnerDetail, TipDetail, TipsterLeaderboardEntry, RaceResultDetail types remain) ...

// 💡 NEW: Data that is ALWAYS loaded (lightweight header/user data)
type RacedayLightData = {
  racedayHeader: RacedayHeaderData;
  compName: string;
  leaderboard: TipsterLeaderboardEntry[];
  tipsterId: number;
  userRole: string;
  comp_raceday_id: number;
  cutoffTime: string | null;
};

// 💡 NEW: Data structure for the Review Component (from this loader)
type ReviewLoaderData = {
    tipsTableData: any[];
    pointsTableData: any[];
    oddsTableData: any[];
    raceNumbers: number[];
};

// 💡 NEW: The combined return type for the loader
export type LoaderData = {
  lightData: RacedayLightData;
  // Deferred data is returned in separate JSON objects keyed by their type
  deferredTips: TipDetail[] | null;
  deferredNextToJump: RaceResultDetail[] | null; 
  deferredRacecard: RaceResultDetail[] | null; 
  deferredReview: ReviewLoaderData | null; // 💡 NEW: Review Data Payload
};


// --- LOADER FUNCTION (GRANULAR SPLIT) ---
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);

  // --- 💡 CHECK FOR DEFERRED LOAD REQUESTS ---
  const url = new URL(request.url);
  const shouldLoadTips = url.searchParams.get("loadTips") === "true";
  const shouldLoadNextToJump = url.searchParams.get("loadNextToJump") === "true";
  const shouldLoadRacecard = url.searchParams.get("loadRacecard") === "true";
  const shouldLoadReview = url.searchParams.get("loadReview") === "true"; // 💡 NEW: Review Check
  const isDeferredRequest = shouldLoadTips || shouldLoadNextToJump || shouldLoadRacecard || shouldLoadReview;
  // ---------------------------------------

  // 1. Auth Check (Heavy getUser() for security)
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    return redirect("/auth", { headers });
  }

  const compId = params.comp_id;
  const compRacedayId = Number(params.comp_raceday_id);
  const numericCompId = Number(compId);

  if (isNaN(compRacedayId) || isNaN(numericCompId)) {
    throw new Response("Invalid ID format", { status: 400, headers });
  }
  
  // 2. Fetch user's tipster ID and ROLE
  const { data: profile, error: profileError } = await supabaseClient
    .from("user_profiles")
    .select( `user_role, tipster:tipster_id(id)` )
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.tipster) {
    throw new Response("User profile (tipster details) not found.", { status: 404, headers });
  }

  const tipsterId = profile.tipster.id;
  const userRole = profile.user_role;

  // Fetch Comp Name and Raceday Header Data (REQUIRED LIGHT DATA)
  const [compDetailsResult, compRacedayDataResult] = await Promise.all([
    supabaseClient.from("comp").select("comp_name").eq("id", numericCompId).single(),
    supabaseClient.from("comp_raceday").select(`id, comp, racecard_day ( id, racecard_name, racecard_date, racecard_cutofftimeUTC, racetrack ( track_name, track_locref ), racecard_race ( id, race_no, race_notes ) )`)
      .eq("id", compRacedayId).maybeSingle(),
  ]);
  
  if (compRacedayDataResult.error || !compRacedayDataResult.data?.racecard_day) {
    throw new Response("Raceday not found or data error", { status: 404, headers });
  }

  const compName = compDetailsResult.data?.comp_name || 'N/A';
  const day = compRacedayDataResult.data.racecard_day;
  const racedayHeader: RacedayHeaderData = {
    raceday_id: day.id, raceday_name: day.racecard_name ?? 'N/A', raceday_date: day.racecard_date ?? 'N/A', race_count: day.racecard_race.length, racetrack_name: day.racetrack?.track_name ?? 'N/A', racetrack_locref: day.racetrack?.track_locref ?? 'N/A', comp_id: numericCompId,
  };
  const cutoffTime = day.racecard_cutofftimeUTC;

  // 3. 💡 LIGHT FETCH: Leaderboard Data (Essential for initial screen)
  const { data: combinedLeaderboardData } = await supabaseClient.rpc("get_comp_raceday_leaderboard", { comp_raceday_id_in: compRacedayId }).returns<TipsterLeaderboardEntry[]>();
  let leaderboard: TipsterLeaderboardEntry[] = combinedLeaderboardData || [];

  // Prepare race map for deferred load
  const rawRaces = day.racecard_race || [];
  const raceData = rawRaces.map(race => ({ race_id: race.id, race_no: Number(race.race_no), race_notes: race.race_notes || '', })).sort((a, b) => a.race_no - b.race_no);
  const raceIdMap = new Map<number, number>();
  raceData.forEach(race => { raceIdMap.set(race.race_no, race.race_id); });


  // --- 💡 SHARED HEAVY DEPENDENCIES (If any deferred section is requested) ---
  
  let raceResults: RaceResultDetail[] = [];
  let userTips: TipDetail[] = [];
  let tipCountMap = new Map<number, Map<number, number>>();
  let uniqueSubTipsMap = new Map<number, Set<string>>();
  
  if (isDeferredRequest && (shouldLoadNextToJump || shouldLoadRacecard)) {
      // 4. Fetch placings/results and shared tip consensus data
      
      // 4a. Fetch placings for all races
      const resultsPromises = raceData.map(race => 
          supabaseClient.from("racecard_race_results").select("id, runner_no, position, wodds, podds").eq("racecard_race_id", race.race_id).order("position")
      );
      const resultsData = await Promise.all(resultsPromises);
      
      // 4b. Fetch all tips for consensus calculation
      const { data: allCompTipsRaw } = await supabaseClient.from("tipster_tips_header").select(`tipster_tips_detail (race_no,tip_main,tip_alt)`).eq("comp_raceday", compRacedayId);
      
      // Calculate Consensus
      if (allCompTipsRaw) {
          for (const header of allCompTipsRaw) {
              if (header.tipster_tips_detail) {
                  for (const tip of header.tipster_tips_detail) {
                      const raceNo = tip.race_no;
                      if (!tipCountMap.has(raceNo)) tipCountMap.set(raceNo, new Map<number, number>());
                      const raceMap = tipCountMap.get(raceNo)!;
                      const runnerToCount = tip.tip_alt || tip.tip_main;
                      if (runnerToCount) raceMap.set(runnerToCount, (raceMap.get(runnerToCount) || 0) + 1);
                      if (tip.tip_main && tip.tip_alt) {
                          if (!uniqueSubTipsMap.has(raceNo)) uniqueSubTipsMap.set(raceNo, new Set<string>());
                          uniqueSubTipsMap.get(raceNo)!.add(`${tip.tip_main},${tip.tip_alt}`);
                      }
                  }
              }
          }
      }
      
      // 4c. Build the base RaceResultDetail structure with placings
      raceResults = await Promise.all(
          raceData.map(async (race, index) => {
              const results = resultsData[index].data || [];
              const hasFinished = results.length > 0;
              let finalResults: PlacedRunner[] = [];
              
              if (hasFinished) {
                  const runnerNos = results.map(r => r.runner_no);
                  const { data: runners } = await supabaseClient.from("racecard_runner").select("runner_no, runner_name").eq("racecard_race", race.race_id).in("runner_no", runnerNos);
                  const runnerMap = new Map<number, string>();
                  if (runners) { runners.forEach(r => runnerMap.set(Number(r.runner_no), r.runner_name || 'N/A')); }
                  finalResults = results.map(r => ({ ...r, wodds: r.wodds ? Number(r.wodds) : null, podds: r.podds ? Number(r.podds) : null, runner_name: runnerMap.get(r.runner_no) ?? 'Name N/A' }));
              }
              
              return { ...race, results: finalResults, allRunners: undefined, uniqueSubTips: undefined };
          })
      );
  }


  // --- 💡 CONDITIONAL FETCHES ---
  
  if (shouldLoadTips) {
      // 5. FETCH USER TIPS (Dedicated Load)
      const { data: currentTipsRawResult } = await supabaseClient.from("tipster_tips_header").select(`tipster_tips_detail (race_no,tip_main,tip_alt)`).eq("tipster", tipsterId).eq("comp_raceday", compRacedayId).maybeSingle();
      
      let userTipsRawData: Omit<TipDetail, 'tip_main_details' | 'tip_alt_details'>[] = currentTipsRawResult?.tipster_tips_detail?.map(tip => ({ race_no: tip.race_no, tip_main: tip.tip_main, tip_alt: tip.tip_alt })) || [];
      userTipsRawData.sort((a, b) => a.race_no - b.race_no);

      // Fetch Runner Details for user tips
      userTips = await Promise.all(userTipsRawData.map(async (tip) => {
          const racecardRaceId = raceIdMap.get(Number(tip.race_no));
          const runnerNos = [tip.tip_main, ...(tip.tip_alt ? [tip.tip_alt] : [])].filter(Boolean);
          if (!racecardRaceId || runnerNos.length === 0) return { ...tip, tip_main_details: null, tip_alt_details: null } as TipDetail;
          
          const { data: runners } = await supabaseClient.from("racecard_runner").select("runner_no, runner_name, runner_jockey").eq("racecard_race", racecardRaceId).in("runner_no", runnerNos);
          const runnerMap = new Map<number, RunnerDetail>();
          if (runners) { runners.forEach(r => { runnerMap.set(Number(r.runner_no), { runner_no: Number(r.runner_no), runner_name: r.runner_name || 'N/A', runner_jockey: r.runner_jockey || 'N/A', }); }); }
          
          return { ...tip, tip_main_details: runnerMap.get(Number(tip.tip_main)) || null, tip_alt_details: tip.tip_alt ? runnerMap.get(Number(tip.tip_alt)) || null : null, } as TipDetail;
      }));
      
      // Return only the tips data for the fetcher
      return json({ deferredTips: userTips } as LoaderData, { headers });
  }


  if (shouldLoadNextToJump || shouldLoadRacecard) {
      // 6. FETCH NEXT TO JUMP / RACECARD DATA (Dedicated Load)
      
      // We must check if the shared dependencies were run (should have been handled by isDeferredRequest block)
      if (!isDeferredRequest) return redirect(request.url.split('?')[0], { headers }); 

      // Augment raceResults with runner data needed for NextToJump/Racecard
      const augmentedResults = await Promise.all(
          raceResults.map(async (race) => {
              // This heavy augmentation is only needed for non-finished races that need consensus/runners data.
              if (race.results.length > 0) return race; 
              
              let raceRunners: RaceRunnerList | undefined = undefined;
              let uniqueSubTips: SubTipCombo[] | undefined = undefined;
              
              // Fetch ALL runners for this race
              const { data: allRunnersData } = await supabaseClient.from("racecard_runner").select("runner_no, runner_name, runner_barrier, runner_jockey, runner_weight, runner_form").eq("racecard_race", race.race_id).order("runner_no", { ascending: true });
              if (allRunnersData) { 
                  const raceTips = tipCountMap.get(race.race_no) || new Map<number, number>();
                  raceRunners = allRunnersData.map(r => ({ 
                      runner_no: Number(r.runner_no), runner_name: r.runner_name || 'N/A', runner_barrier: r.runner_barrier ? Number(r.runner_barrier) : null, runner_jockey: r.runner_jockey || null, runner_weight: r.runner_weight ? String(r.runner_weight) : null, runner_form: r.runner_form || null, tipster_count: raceTips.get(Number(r.runner_no)) || 0, 
                  }));
              }
              
              // Calculate unique sub tips combinations (same logic as before)
              const subComboSet = uniqueSubTipsMap.get(race.race_no);
              if (subComboSet && subComboSet.size > 0) {
                  const uniqueRunnerNos = new Set<number>();
                  const combosToResolve: { main: number, alt: number }[] = [];
                  for (const comboKey of subComboSet) { const [mainStr, altStr] = comboKey.split(','); const main = Number(mainStr); const alt = Number(altStr); uniqueRunnerNos.add(main); uniqueRunnerNos.add(alt); combosToResolve.push({ main, alt }); }
                  const { data: subRunnersData } = await supabaseClient.from("racecard_runner").select("runner_no, runner_name").eq("racecard_race", race.race_id).in("runner_no", Array.from(uniqueRunnerNos));
                  const runnerNameMap = new Map<number, string>();
                  if (subRunnersData) { subRunnersData.forEach(r => runnerNameMap.set(Number(r.runner_no), r.runner_name || 'N/A')); }
                  uniqueSubTips = combosToResolve.map(combo => ({ main_runner_no: combo.main, main_runner_name: runnerNameMap.get(combo.main) || `Runner ${combo.main} N/A`, alt_runner_no: combo.alt, alt_runner_name: runnerNameMap.get(combo.alt) || `Runner ${combo.alt} N/A`, }));
              }

              return { ...race, allRunners: raceRunners, uniqueSubTips: uniqueSubTips } as RaceResultDetail;
          })
      );

      // Return data based on which request was made
      if (shouldLoadNextToJump) {
          return json({ deferredNextToJump: augmentedResults } as LoaderData, { headers });
      }
      
      // If loadRacecard
      return json({ deferredRacecard: augmentedResults } as LoaderData, { headers });
  }

  // 💡 NEW: CONDITIONAL FETCH FOR REVIEW
  if (shouldLoadReview) {
      // 7. FETCH REVIEW DATA (Dedicated Load)
      
      // This is the logic from the old review.tsx loader
      const { data: reviewData, error: rpcError } = await supabaseClient
          .rpc("get_raceday_review_data", { comp_raceday_id_in: compRacedayId })
          .returns<ReviewData[]>(); 

      if (rpcError) { throw new Response("Could not load review data", { status: 500, headers }); }

      const raceNumbers = raceData.map(r => r.race_no);
          
      const augmentedData: AugmentedReviewData[] = (reviewData || []).map(tipster => {
          const totalPoints = Object.values(tipster.points).reduce((sum, pts) => sum + pts, 0);
          const totalOdds = Object.values(tipster.odds).reduce((sum, odd) => sum + odd, 0);
          const hasTipped = Object.keys(tipster.tips).length > 0;
          return { ...tipster, totalPoints, totalOdds, hasTipped };
      });

      const tipsTableData = [...augmentedData].sort((a, b) => {
          if (a.hasTipped !== b.hasTipped) return a.hasTipped ? -1 : 1;
          return a.tipster_nickname.localeCompare(b.tipster_nickname);
      });
      const pointsTableData = [...augmentedData].sort((a, b) => {
          if (a.hasTipped !== b.hasTipped) return a.hasTipped ? -1 : 1;
          if (a.totalPoints !== b.totalPoints) return b.totalPoints - a.totalPoints;
          return a.tipster_nickname.localeCompare(b.tipster_nickname);
      });
      const oddsTableData = [...augmentedData].sort((a, b) => {
          if (a.hasTipped !== b.hasTipped) return a.hasTipped ? -1 : 1;
          if (a.totalOdds !== b.totalOdds) return b.totalOdds - a.totalOdds;
          return a.tipster_nickname.localeCompare(b.tipster_nickname);
      });
      
      const reviewPayload: ReviewLoaderData = {
          tipsTableData, pointsTableData, oddsTableData, raceNumbers
      };

      return json({ deferredReview: reviewPayload } as LoaderData, { headers });
  }


  // --- 💡 INITIAL LIGHT RETURN (If no query parameter is set) ---
  const lightData: RacedayLightData = {
    racedayHeader,
    compName,
    leaderboard,
    tipsterId,
    userRole,
    comp_raceday_id: compRacedayId,
    cutoffTime,
  };

  // Only the light data is needed for the initial render
  return json(
    { lightData, deferredTips: null, deferredNextToJump: null, deferredRacecard: null, deferredReview: null } as LoaderData,
    {
      headers: {
        ...headers,
        'Cache-Control': 'max-age=5, private' // Very short cache time due to volatility
      }
    }
  );
};

// --- REACT COMPONENT: DISPLAYING DATA (REFITTED FOR GRANULAR DEFERRED LOADING) ---
export default function RacedayDetail() {
  const initialData = useLoaderData<typeof loader>();
  
  // 💡 FOUR FETCHERS FOR GRANULAR LOADING
  const tipsFetcher = useFetcher<typeof loader>();
  const nextToJumpFetcher = useFetcher<typeof loader>();
  const racecardFetcher = useFetcher<typeof loader>();
  const reviewFetcher = useFetcher<typeof loader>(); // 💡 Review Fetcher (Hits this loader)

  const { lightData } = initialData;

  // 💡 CONSOLIDATE DATA ACROSS INITIAL LOAD AND FETCHERS
  const tipsData = initialData.deferredTips || tipsFetcher.data?.deferredTips;
  const nextToJumpData = initialData.deferredNextToJump || nextToJumpFetcher.data?.deferredNextToJump;
  const racecardData = initialData.deferredRacecard || racecardFetcher.data?.deferredRacecard;
  const reviewData = initialData.deferredReview || reviewFetcher.data?.deferredReview; // 💡 Review Data
  
  const isTipsLoaded = !!tipsData;
  const isNextToJumpLoaded = !!nextToJumpData;
  const isRacecardLoaded = !!racecardData;
  const isReviewLoaded = !!reviewData; // Check if review data is loaded

  const isLoadingTips = tipsFetcher.state === 'loading';
  const isLoadingNextToJump = nextToJumpFetcher.state === 'loading';
  const isLoadingRacecard = racecardFetcher.state === 'loading';
  const isLoadingReview = reviewFetcher.state === 'loading';

  // --- Lockout Check (UNCHANGED) ---
  let isLocked = false;
  const now = new Date("2025-10-25T09:00:00+11:00"); 
  if (lightData.cutoffTime) {
    const cutoff = new Date(lightData.cutoffTime);
    if (now > cutoff) {
      isLocked = true;
    }
  }
  // ---

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  // Helper to determine if a race has results
  const hasResults = (race: RaceResultDetail) => { 
    return race.results && race.results.length > 0;
  };
  
  // Use NextToJump data if loaded, otherwise use Racecard data if loaded, otherwise empty array
  const currentRaceResults = nextToJumpData || racecardData || []; 
  const nextToJumpIndex = currentRaceResults.findIndex((race) => !hasResults(race));

  // 💡 HANDLERS FOR EACH BUTTON
  function handleLoadTips() {
    tipsFetcher.load(`?loadTips=true`); 
  }
  function handleLoadNextToJump() {
    nextToJumpFetcher.load(`?loadNextToJump=true`); 
  }
  function handleLoadRacecard() {
    racecardFetcher.load(`?loadRacecard=true`); 
  }
  // 💡 HANDLER FOR REVIEW (TIPSTER DETAIL)
  function handleLoadReview() {
      reviewFetcher.load(`?loadReview=true`);
  }


  const buttonContainerClasses = "flex justify-center w-full"; // Ensures button is always centered
  const buttonInnerClasses = "bg-alt text-white font-semibold py-2 px-6 rounded-full transition-colors w-full max-w-lg text-center  active:bg-altlight active:scale-[0.95]  transform"; // Fixed width button
  const loadingClasses = "p-4 bg-gray-50 rounded-lg text-main font-semibold w-60 mx-auto text-center"; 


  return (
    <div className="p-2 max-w-xl mx-auto lg:max-w-7xl lg:items-start">
      {/* --- RACEDAY HEADER (LIGHT) --- */}
      <div className="mb-0 p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <p className="text-3xl font-heading font-extrabold text-main mb-3 pb-1 pl-1 leading-none">
            {lightData.racedayHeader.raceday_name}
          </p>
        </div>
        <div className="flex items-center pl-1 space-x-3">
          <div
            className="flex-shrink-0 flex items-center justify-center min-w-[3rem] 
                                bg-white border-2 border-main "
          >
            <p className="text-lg font-heading font-extrabold text-main uppercase py-2.5 px-2">
              {lightData.racedayHeader.racetrack_locref}
            </p>
          </div>
          <div className="flex flex-col space-y-0.5">
            <p className="text-md font-body text-blackmain leading-none">
              {lightData.racedayHeader.racetrack_name} -{" "}
              {formatDate(lightData.racedayHeader.raceday_date)}
            </p>
            <Link
              to={`/comps/${lightData.racedayHeader.comp_id}`}
              className="text-md underline font-heading text-main hover:text-alt transition"
            >
              {lightData.compName}
            </Link>
          </div>
        </div>
      </div>

      {/* --- ADMIN/USER MENU (LIGHT) --- */}
      <div className="py-2 pr-2 flex items-center justify-end ">
        {/* 1. Enter Results (ADMIN ONLY) */}
        {lightData.userRole === "superadmin" && (
          <Link
            to={`/admin/results/${lightData.racedayHeader.raceday_id}`}
            title="Enter Race Results"
            className="p-2 text-alt inline-flex items-center space-x-1 hover:bg-mainlight rounded-md"
          >
            <span className="material-symbols-outlined text-xl">captive_portal</span>
            <span className="text-sm font-medium">Enter Results</span>
          </Link>
        )}

        {/* 3. Edit Tips (Conditionally enabled) - REMAINS HERE */}
        {isLocked ? (
          <div
            title="Tips are locked for this raceday."
            className="p-2 text-gray-400 inline-flex items-center space-x-1 cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-xl">lock</span>
            <span className="text-md font-medium">Enter My Tips</span>
          </div>
        ) : (
          <Link
            to={`/comps/${lightData.racedayHeader.comp_id}/${lightData.comp_raceday_id}/edit-tips#review-section`}
            title="Edit My Tips"
            className="p-2 text-alt inline-flex items-center space-x-1 hover:bg-mainlight rounded-md"
          >
            <span className="material-symbols-outlined text-xl">edit_square</span>
            <span className="text-sm font-medium">Edit My Tips</span>
          </Link>
        )}
      </div>


      {/* --- LEADERBOARDS (LIGHT - Always Visible) --- */}
      <div className="grid grid-cols-1 gap-8 lg:gap-4 lg:grid-cols-2 mt-2 mb-8 lg:items-start">
        <LeaderboardPoints
          leaderboardData={lightData.leaderboard}
          currentTipsterId={lightData.tipsterId}
        />
        <LeaderboardOdds
          leaderboardData={lightData.leaderboard}
          currentTipsterId={lightData.tipsterId}
        />
      </div>


      {/* 💡 --- GRANULAR DEFERRED CONTENT BLOCK --- 💡 */}
      <div className="space-y-8 mb-2">

        {/* 1. 🛑 NEW COMBINED SECTION: MY TIPS & NEXT TO JUMP */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            
            {/* LEFT COLUMN: MY TIPS */}
            <div className="col-span-1">
                {isTipsLoaded ? (
                    <MyTipsSection userTips={tipsData} />
                ) : (
                    <div className={buttonContainerClasses}>
                        {isLoadingTips ? (
                            <div className={loadingClasses}>Loading My Tips...</div>
                        ) : (
                            <button onClick={handleLoadTips} className={buttonInnerClasses}>
                                View My Tips
                            </button>
                        )}
                    </div>
                )}
            </div>
            
            {/* RIGHT COLUMN: NEXT TO JUMP */}
            <div className="col-span-1">
                {isNextToJumpLoaded ? (
                    <NextToJumpSummary
                        racedayHeader={lightData.racedayHeader}
                        raceResults={nextToJumpData} // Requires full augmented data
                        nextToJumpIndex={nextToJumpIndex}
                    />
                ) : (
                    <div className={buttonContainerClasses}>
                        {isLoadingNextToJump ? (
                            <div className={loadingClasses}>Loading Next To Jump...</div>
                        ) : (
                            <button onClick={handleLoadNextToJump} className={buttonInnerClasses}>
                                View Next To Jump
                            </button>
                        )}
                    </div>
                )}
            </div>
        </section>
        
        {/* 2. 🛑 NEW SECTION: VIEW ALL TIPS (TIPSTER DETAIL) */}
        <section>
          {isReviewLoaded ? (
              <TipsterAllTips 
                  tipsTableData={reviewData.tipsTableData}
                  pointsTableData={reviewData.pointsTableData}
                  oddsTableData={reviewData.oddsTableData}
                  raceNumbers={reviewData.raceNumbers}
              />
          ) : (
              <div className={buttonContainerClasses}>
                {isLoadingReview ? (
                    <div className={loadingClasses}>Loading All Tips...</div>
                ) : (
                    <button onClick={handleLoadReview} className={buttonInnerClasses}>
                        Leaderboard Detail
                    </button>
                )}
              </div>
          )}
        </section>


        {/* 3. FULL RACECARD SECTION (Deferred) */}
        <section>
          {isRacecardLoaded ? (
            <Racecard raceResults={racecardData} nextToJumpIndex={nextToJumpIndex} />
          ) : (
            <div className={buttonContainerClasses}>
              {isLoadingRacecard ? (
                <div className={loadingClasses}>Loading Full Racecard Details...</div>
              ) : (
                <button onClick={handleLoadRacecard} className={buttonInnerClasses}>
                  Form Guide & Results
                </button>
              )}
            </div>
          )}
        </section>

      </div>
      {/* 💡 --- END GRANULAR DEFERRED BLOCK --- 💡 */}


      {/* 🛑 Outlet is now only used for the /edit-tips route. 
        The /review route is deprecated.
      */}
      <div id="review-section" className="mt-12 pt-8">
        <Outlet />
      </div>
    </div>
  );
}