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

export type RunnerDetail = {
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

export type RacedayTipsData = {
    racedayHeader: RacedayHeaderData;
    userTips: TipDetail[];
};

// --- LOADER FUNCTION: FETCHING RACEDAY DETAILS AND USER TIPS ---
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    const { supabaseClient } = createSupabaseServerClient(request);

    // 1. Auth check
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

    // 2. Fetch the user's tipster ID
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


    // 3. Get Raceday Header Data & Race IDs
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
                    race_no
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

    // Prepare a map of Race No. to Racecard_Race ID
    const raceIdMap = new Map<number, number>();
    day.racecard_race.forEach(race => {
        if (race.race_no) {
            raceIdMap.set(Number(race.race_no), race.id);
        }
    });

    // 4. Fetch current user's tips, filtering directly by comp_raceday.id
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

    // 5. Fetch Runner Details for all tips
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


    return json({ racedayHeader, userTips: tipsWithDetails } as RacedayTipsData);
};


// --- REACT COMPONENT: DISPLAYING DATA ---
export default function RacedayDetail() {
    const { racedayHeader, userTips } = useLoaderData<typeof loader>();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="p-8 max-w-xl mx-auto lg:max-w-7xl">

            {/* --- RACEDAY HEADER (OPTIONAL - You can style this better) --- */}
            <div className="mb-8 border-b pb-4">
                <p className="text-xl font-heading font-extrabold text-gray-800">
                    {racedayHeader.raceday_name} ({racedayHeader.racetrack_locref})
                </p>
                <p className="text-sm font-body text-gray-500">
                    {racedayHeader.racetrack_name} - {formatDate(racedayHeader.raceday_date)}
                </p>
            </div>
            {/* ------------------------------------------------------------------ */}


            {/* 📝 USER TIPS SECTION 📝 */}
            
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
                <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-10">
                    {userTips.map((tip, index) => (
                        <li
                            key={index}
                            className="p-4 bg-white shadow-lg rounded-lg border border-gray-100"
                        >
                            <div className="flex flex-col space-y-3">
                                {/* Race Number Header */}
                                <div className="flex items-center space-x-2 border-b pb-2">
                                    <span className="text-xs font-heading font-semibold text-gray-500 uppercase">Race</span>
                                    <span className="text-2xl font-heading font-extrabold text-indigo-600">
                                        {tip.race_no}
                                    </span>
                                </div>
                                
                                {/* MAIN TIP */}
                                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                                    <p className="text-sm font-body font-bold text-green-600 mb-1">MAIN TIP: Runner #{tip.tip_main}</p>
                                    
                                    <p className="text-xl font-heading font-extrabold text-gray-800">
                                        {tip.tip_main_details?.runner_name || "Runner Name Unavailable"}
                                    </p>
                                    <p className="text-sm font-body text-gray-500 italic">
                                        Jockey: {tip.tip_main_details?.runner_jockey || "N/A"}
                                    </p>
                                </div>

                                {/* ALTERNATE TIP (Conditional) */}
                                {tip.tip_alt && (
                                    <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                                        <p className="text-sm font-body font-bold text-yellow-600 mb-1">ALT TIP: Runner #{tip.tip_alt}</p>
                                        
                                        <p className="text-lg font-heading font-bold text-gray-700">
                                            {tip.tip_alt_details?.runner_name || "Runner Name Unavailable"}
                                        </p>
                                        <p className="text-sm font-body text-gray-500 italic">
                                            Jockey: {tip.tip_alt_details?.runner_jockey || "N/A"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}