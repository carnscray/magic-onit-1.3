// app/routes/comps.$comp_id.$comp_raceday_id.review.tsx

import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";
// [REMOVED] TipsterHeader import removed

// --- Types ---

// 💡 NEW: Define the structure of a single tip
type TipObject = {
  main: number;
  alt: number | null;
};

// This type must match the 'returns table' of your SQL function
type ReviewData = {
  tipster_id: number;
  tipster_nickname: string;
  tips: Record<string, TipObject>; // 💡 MODIFIED: {"1": {"main": 5, "alt": 2}}
  points: Record<string, number>;
  odds: Record<string, number>;
};

type AugmentedReviewData = ReviewData & {
  totalPoints: number;
  totalOdds: number;
  hasTipped: boolean;
};

type LoaderData = {
  tipsTableData: AugmentedReviewData[];
  pointsTableData: AugmentedReviewData[];
  oddsTableData: AugmentedReviewData[];
  raceNumbers: number[];
  racedayName: string;
  racetrackName: string;
  racedayDate: string;
  tipsterNickname: string;
};

// --- Helper Function ---
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

// --- Loader (OPTIMIZED) ---
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const comp_raceday_id = Number(params.comp_raceday_id);

  if (isNaN(comp_raceday_id)) {
    throw new Response("Invalid ID", { status: 400 });
  }

  // 1. 💡 OPTIMIZATION: Auth Check (Fast getSession)
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !session) {
    return redirect("/auth", { headers });
  }
  const authUserId = session.user.id; // Use ID from session
  
  // Fetch Nickname (Required for component display)
  const { data: profile } = await supabaseClient
    .from("user_profiles")
    .select("tipster:tipster_id(tipster_nickname)")
    .eq("id", authUserId)
    .single();

  // 2. Call the RPC function to get all review data
  const { data: reviewData, error: rpcError } = await supabaseClient
    .rpc("get_raceday_review_data", {
      comp_raceday_id_in: comp_raceday_id,
    })
    .returns<ReviewData[]>(); // 💡 This will now use the updated ReviewData type

  if (rpcError) {
    console.error("RPC Error:", rpcError);
    throw new Response("Could not load review data", { status: 500, headers });
  }

  // 3. Get the list of race numbers for the table headers
  const { data: racecardDayData } = await supabaseClient
    .from("comp_raceday")
    .select(
      `
      racecard_day (
        id,
        racecard_name,
        racecard_date,
        racetrack ( track_name ),
        racecard_race ( race_no )
      )
    `
    )
    .eq("id", comp_raceday_id)
    .single();

  if (!racecardDayData?.racecard_day) {
    throw new Response("Raceday not found", { status: 404, headers });
  }

  const raceNumbers = racecardDayData.racecard_day.racecard_race
    .map((r) => r.race_no)
    .sort((a, b) => a - b);
    
  // --- Augment and Sort Data (Unchanged) ---
  const augmentedData: AugmentedReviewData[] = (reviewData || []).map(tipster => {
    const totalPoints = Object.values(tipster.points).reduce((sum, pts) => sum + pts, 0);
    const totalOdds = Object.values(tipster.odds).reduce((sum, odd) => sum + odd, 0);
    const hasTipped = Object.keys(tipster.tips).length > 0;

    return {
      ...tipster,
      totalPoints,
      totalOdds,
      hasTipped
    };
  });

  // Sort 1 (Tips Table): By hasTipped, then nickname
  const tipsTableData = [...augmentedData].sort((a, b) => {
    if (a.hasTipped !== b.hasTipped) {
      return a.hasTipped ? -1 : 1;
    }
    return a.tipster_nickname.localeCompare(b.tipster_nickname);
  });

  // Sort 2 (Points Table): By hasTipped, then totalPoints (desc), then nickname
  const pointsTableData = [...augmentedData].sort((a, b) => {
    if (a.hasTipped !== b.hasTipped) {
      return a.hasTipped ? -1 : 1;
    }
    if (a.totalPoints !== b.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return a.tipster_nickname.localeCompare(b.tipster_nickname);
  });

  // Sort 3 (Odds Table): By hasTipped, then totalOdds (desc), then nickname
  const oddsTableData = [...augmentedData].sort((a, b) => {
    if (a.hasTipped !== b.hasTipped) {
      return a.hasTipped ? -1 : 1;
    }
    if (a.totalOdds !== b.totalOdds) {
      return b.totalOdds - a.totalOdds;
    }
    return a.tipster_nickname.localeCompare(b.tipster_nickname);
  });
  
  // 💡 CACHING: Added Cache-Control header
  return json(
    {
      tipsTableData,
      pointsTableData,
      oddsTableData,
      raceNumbers,
      racedayName: racecardDayData.racecard_day.racecard_name,
      racetrackName: racecardDayData.racecard_day.racetrack?.track_name ?? 'N/A',
      racedayDate: racecardDayData.racecard_day.racecard_date,
      tipsterNickname: profile?.tipster?.tipster_nickname || "User",
    },
    { 
        headers: {
            ...headers,
            'Cache-Control': 'max-age=15, private' // Cache for 15 seconds
        }
    }
  );
};

// --- 💡 COMPONENT (Unchanged) ---
export default function RacedayReview() {
  const { 
    tipsTableData,
    pointsTableData,
    oddsTableData,
    raceNumbers, 
    racedayName, 
    racetrackName,
    racedayDate,   
    tipsterNickname // This is no longer used, but removing it from the destructuring is optional
  } = useLoaderData<typeof loader>();

  const thClasses = "p-2 border border-gray-300 bg-mainlight text-left text-sm font-bold";
  const tdClasses = "p-2 border border-gray-300 text-sm";
  const tipsterCellClasses = `${tdClasses} font-medium sticky left-0 bg-white/90`;
  const headerCellClasses = `${thClasses} text-center sticky top-0`;
  const totalCellClasses = `${tdClasses} text-center font-bold bg-gray-50`;

  return (
    <div className="p-2 max-w-7xl mx-auto">
      {/* [REMOVED] TipsterHeader component removed */}

      {/* Page Header */}
      <div className="my-12 p-4 bg-gradient-custom text-white rounded-t-2xl">
        <h1 className="text-3xl font-heading font-extrabold">
          Tipster Detail
        </h1>
        <p className="text-lg">
          {racedayName} | {racetrackName} | {formatDate(racedayDate)}
        </p>
      </div>


      <div className="bg-white p-6 shadow-xl rounded-b-2xl -mt-12 space-y-12 mb-12">
        {/* --- 💡 TABLE 1: TIPS (Updated) --- */}
        <section>
          <h2 className="text-2xl font-bold text-main mb-4">Tipster Selections</h2>
          <div className="overflow-x-auto relative border border-gray-300 rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${headerCellClasses} left-0`}>Tipster</th>
                  {raceNumbers.map((num) => (
                    <th key={num} className={headerCellClasses}>{`R${num}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tipsTableData.map((tipster) => (
                  <tr key={tipster.tipster_id} className="hover:bg-gray-50">
                    <td className={tipsterCellClasses}>
                      {tipster.tipster_nickname}
                    </td>
                    {raceNumbers.map((num) => {
                      // --- 💡 MODIFICATION: Check for tip_alt ---
                      const tip = tipster.tips[num];
                      let displayTip = "-";
                      if (tipster.hasTipped && tip) {
                        if (tip.alt) {
                          displayTip = `${tip.main} s${tip.alt}`;
                        } else {
                          displayTip = String(tip.main);
                        }
                      }
                      
                      return (
                        <td key={num} className={`${tdClasses} text-center`}>
                          {!tipster.hasTipped ? <span className="text-greymain">-</span> : displayTip}
                        </td>
                      );
                      // --- END MODIFICATION ---
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* --- TABLE 2: POINTS (Unchanged) --- */}
        <section>
          <h2 className="text-2xl font-bold text-main mb-4">Points Earned</h2>
          <div className="overflow-x-auto relative border border-gray-300 rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${headerCellClasses} left-0`}>Tipster</th>
                  {raceNumbers.map((num) => (
                    <th key={num} className={headerCellClasses}>{`R${num}`}</th>
                  ))}
                  <th className={headerCellClasses}>Total</th>
                </tr>
              </thead>
              <tbody>
                {pointsTableData.map((tipster) => (
                  <tr key={tipster.tipster_id} className="hover:bg-gray-50">
                    <td className={tipsterCellClasses}>
                      {tipster.tipster_nickname}
                    </td>
                    {raceNumbers.map((num) => {
                      const points = tipster.points[num] || 0;
                      const cellBg = points > 0 ? 'bg-second' : '';
                      const cellText = !tipster.hasTipped ? 'text-greymain' : (points === 0 ? 'text-mainlight' : '');
                      return (
                        <td key={num} className={`${tdClasses} text-center ${cellBg} ${cellText}`}>
                          {!tipster.hasTipped ? "-" : points}
                        </td>
                      );
                    })}
                    <td className={totalCellClasses}>
                      {!tipster.hasTipped ? <span className="text-greymain">-</span> : tipster.totalPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* --- TABLE 3: ODDS (Unchanged) --- */}
        <section>
          <h2 className="text-2xl font-bold text-main mb-4">Odds Earned</h2>
          <div className="overflow-x-auto relative border border-gray-300 rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${headerCellClasses} left-0`}>Tipster</th>
                  {raceNumbers.map((num) => (
                    <th key={num} className={headerCellClasses}>{`R${num}`}</th>
                  ))}
                  <th className={headerCellClasses}>Total</th>
                </tr>
              </thead>
              <tbody>
                {oddsTableData.map((tipster) => (
                  <tr key={tipster.tipster_id} className="hover:bg-gray-50">
                    <td className={tipsterCellClasses}>
                      {tipster.tipster_nickname}
                    </td>
                    {raceNumbers.map((num) => {
                      const odds = tipster.odds[num] || 0;
                      const cellBg = odds > 0 ? 'bg-second' : '';
                      const cellText = !tipster.hasTipped ? 'text-greymain' : (odds === 0 ? 'text-mainlight' : '');
                      return (
                        <td key={num} className={`${tdClasses} text-center ${cellBg} ${cellText}`}>
                          {!tipster.hasTipped ? "-" : odds.toFixed(2)}
                        </td>
                      );
                    })}
                    <td className={totalCellClasses}>
                      {!tipster.hasTipped ? <span className="text-greymain">-</span> : tipster.totalOdds.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}