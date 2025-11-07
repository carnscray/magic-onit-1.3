// app/components/Racecard.tsx

import type { 
    RaceResultDetail, 
    PlacedRunner // 💡 NEW: Import PlacedRunner type
} from "~/routes/comps.$comp_id.$comp_raceday_id"; 

// --- STUBS (Modified) ---

// 1. 💡 FIXED: hasResults now checks the 'results' array
const hasResults = (race: RaceResultDetail): boolean => {
    return race.results && race.results.length > 0;
}

// 2. Stub for getFormSlice (Unchanged)
const getFormSlice = (form: string | null): string => {
    if (!form) return '';
    // Returns the last 5 characters of the form string
    return form.slice(-5); 
};

// 3. Stub for getOrdinal (Unchanged)
const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};


// 4. Stub for ResultsRow Component (Unchanged, it's already compatible)
const ResultsRow = ({
    place, runnerNo, runnerName, wOdds, pOdds, isFirst, isLast
}: {
    place: number, 
    runnerNo: number | null, 
    runnerName: string | null, 
    wOdds?: number | null, 
    pOdds: number | null,
    isFirst: boolean,
    isLast: boolean
}) => {
    
    const placeText = getOrdinal(place);
    const placeClasses = isFirst ? 'font-bold text-blackmain' : 'text-greymain';
    const rowBackgroundClass = isFirst ? 'bg-second' : '';

    // Add '$' and Check for 'NTD' (0.00)
    const formattedWOdds = (isFirst && wOdds !== null) 
        ? `$${wOdds.toFixed(2)}` 
        : '';

    let formattedPOdds = '';
    // 💡 FIX: Also show podds for 1st place
    if (place <= 3 && pOdds !== null) { 
        if (pOdds === 0.00) {
            formattedPOdds = 'NTD';
        } else {
            formattedPOdds = `$${pOdds.toFixed(2)}`;
        }
    }

    return (
        <div 
            className={`grid grid-cols-12 items-center text-sm  py-3 '} ${rowBackgroundClass}`}
        >
            {/* 1. Place Text */}
            <div className="col-span-2 pl-6">
                <span className={`font-semibold text-sm uppercase ${placeClasses}`}>
                    {placeText}
                </span>
            </div>
            
            {/* 2. Runner No. & Runner Name */}
            <div className="col-span-6 truncate text-blackmain text-sm font-medium flex items-center space-x-1">
                {runnerNo !== null && <span className="font-extrabold text-sm text-blackmain pr-2">{runnerNo}.</span>}
                <span className="truncate">{runnerName}</span> 
            </div>
            
            {/* 3. Win Odds */}
            <div className="col-span-2 text-right text-sm  text-blackmain pr-2">
                {formattedWOdds}
            </div>

            {/* 4. Place Odds */}
            <div className="col-span-2 text-right text-sm  text-blackmain pr-6">
                {formattedPOdds}
            </div>
        </div>
    );
}
// --- END OF STUBS ---


interface RacecardProps {
    raceResults: RaceResultDetail[]; // This now uses the NEW RaceResultDetail type
    nextToJumpIndex: number; 
}

export function Racecard({ raceResults, nextToJumpIndex }: RacecardProps) {
    return (
        <div className="w-full">
            {/* 🏁 RACE LIST AND RESULTS SECTION 🏁 */}
            {/* Header (UNCHANGED) */}
            <div className="flex items-center justify-between p-4 bg-blackmain text-white rounded-t-2xl mt-10">
                <div className="flex items-center space-x-3">
                    <span className="material-symbols-outlined text-3xl">
                        List_Alt
                    </span>
                    <h2 className="text-2xl font-heading font-semibold">
                        Racecard
                    </h2>
                </div>
                <span className="flex items-center justify-center h-8 w-8 rounded-4px bg-white text-blackmain text-base font-bold  flex-shrink-0">
                    {raceResults.length}
                </span>
            </div>

            {/* Race List */}
            <ul className="grid grid-cols-1 gap-12 lg:gap-4 lg:grid-cols-2 mb-10 items-start">
                {raceResults.map((race, index) => {
                    
                    let statusText: 'RESULT' | 'NEXT TO JUMP' | null = null;
                    let statusClasses = '';
                    
                    // 💡 MODIFIED: Using new hasResults function
                    if (hasResults(race)) { 
                        statusText = 'RESULT';
                        statusClasses = 'bg-second text-main';
                    } else if (index === nextToJumpIndex && index !== -1) {
                        statusText = 'NEXT TO JUMP';
                        statusClasses = 'bg-alert text-white';
                    }

                    // --- RUNNER DATA PROCESSING (UNCHANGED) ---
                    const runners = race.allRunners || [];
                    let displayedRunners = runners;

                    if (!hasResults(race) && runners.length > 0) {
                        displayedRunners = [...runners].sort((a, b) => (a.runner_no || 0) - (b.runner_no || 0));
                    }
                    // --- END RUNNER DATA PROCESSING ---

                    return (
                        <li
                            key={index}
                            className="p-0 bg-white shadow-lg rounded-lg border border-gray-100"
                        >
                            <div className="flex flex-col"> 
                                
                                {/* Race Header (Unchanged) */}
                                <div className="flex items-center justify-between border-b p-2 bg-mainlight p-2">
                                    <div className="flex items-center space-x-3 min-w-0 overflow-hidden">
                                        <span className="text-xl font-heading font-extrabold text-blackmain px-2 py-0.5 bg-white border-2 border border-black flex-shrink-0">
                                            {race.race_no}
                                        </span>
                                        {race.race_notes && (
                                            <span className="text-sm text-blackmain truncate mr-4">
                                                {race.race_notes}
                                            </span>
                                        )}
                                    </div>
                                    {statusText && (
                                        <span className={`text-xs font-bold px-3 py-1 flex-shrink-0 rounded-full ${statusClasses}`}>
                                            {statusText}
                                        </span>
                                    )}
                                </div>

                                {/* 💡 MODIFIED: Conditional Display Logic */}
                                {hasResults(race) ? (
                                    // **1. DISPLAY RESULTS (NOW DYNAMIC) **
                                    <div className="p-0 divide-y divide-greymain"> 
                                        
                                        {/* Map over the new race.results array */}
                                        {race.results
                                            .sort((a: PlacedRunner, b: PlacedRunner) => a.position - b.position)
                                            .map((result: PlacedRunner, index: number) => (
                                                <ResultsRow
                                                    key={result.id}
                                                    place={result.position}
                                                    runnerNo={result.runner_no}
                                                    runnerName={result.runner_name}
                                                    wOdds={result.wodds} 
                                                    pOdds={result.podds} 
                                                    isFirst={result.position === 1}
                                                    isLast={index === race.results.length - 1}
                                                />
                                            ))
                                        }

                                    </div>
                                ) : (
                                    // **2. DISPLAY FULL RUNNER LIST (UNCHANGED)**
                                    <div className="pt-0 divide-y divide-greymain pb-2">
                                        
                                        {/* Column Labels */}
                                        <div className="grid grid-cols-12 text-xs font-semibold uppercase text-blackmain tracking-wider pb-2 pt-2">
                                            <div className="col-span-2 pl-6">No.</div> 
                                            <div className="col-span-8 pl-0">Runner</div>
                                            <div className="col-span-2 text-center">Tips</div>
                                        </div>
                                    
                                        <div className="space-y-1 divide-y divide-greymain"> 
                                            {displayedRunners.map((runner) => (
                                                <div key={runner.runner_no} className="grid grid-cols-12 items-center text-sm  last:border-b-0 py-0.5">
                                                    
                                                    {/* 1. RUNNER NO. */}
                                                    <div className="col-span-2 font-medium text-gray-800 pr-1">
                                                        <span className="font-extrabold text-blackmain mr-1 text-lg pl-6">
                                                            {runner.runner_no}.
                                                        </span>
                                                    </div>

                                                    {/* 2. RUNNER NAME + DETAILS */}
                                                    <div className="col-span-8 font-medium text-blackmain pl-0 pr-2">
                                                        <div className="flex items-baseline">
                                                            <span className="text-blackmain ">
                                                                {runner.runner_name} 
                                                            </span>
                                                            <span className="text-greymain font-normal ml-2 text-xs flex-shrink-0">
                                                                ({runner.runner_barrier !== null ? runner.runner_barrier : 'Scr'})
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center space-x-3 text-xs text-greymain font-normal mt-0.5">
                                                            <span className="truncate">
                                                                <span className=" mr-1">F:</span>
                                                                {getFormSlice(runner.runner_form) || 'N/A'}
                                                            </span>
                                                            <span className="truncate">
                                                                <span className=" mr-1">J:</span>
                                                                {runner.runner_jockey || 'N/A'}
                                                            </span>
                                                            <span className="text-greymain font-normal ml-2 text-xs flex-shrink-0">
                                                                {runner.runner_weight || ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* 3. TIPSTER COUNT */}
                                                    <div className="col-span-2 text-center">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${runner.tipster_count && runner.tipster_count > 0 ? 'bg-second text-main' : 'text-greymain'}`}>
                                                            {runner.tipster_count || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Handle case where race has no results and no runners found */}
                                        {runners.length === 0 && (
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
        </div>
    );
}