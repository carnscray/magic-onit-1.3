// app/components/Racecard.tsx

// 💡 Ensure this type is available, either by importing it correctly
// or by defining a shared type file.
import type { RaceResultDetail } from "~/routes/comps.$comp_id.$comp_raceday_id"; 

// --- TEMPORARY STUBS TO RESOLVE RENDERING ERROR ---
// These functions and component must eventually be imported from a shared utility 
// or component file to keep Racecard.tsx clean.

// 1. Stub for hasResults (Logic copied from original route file)
const hasResults = (race: RaceResultDetail): boolean => {
    return race.race_1st !== null;
}

// 2. Stub for getFormSlice (Logic copied from original route file)
const getFormSlice = (form: string | null): string => {
    if (!form) return '';
    // Returns the last 5 characters of the form string
    return form.slice(-5); 
};

// Helper to get ordinal suffix (1 -> 1st, 2 -> 2nd, 3 -> 3rd, 4 -> 4th)
const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};


// 3. Stub for ResultsRow Component (MODIFIED FOR HEIGHT AND COLUMN STRUCTURE)
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
    
    // Get ordinal text (e.g., "1st")
    const placeText = getOrdinal(place);
    
    // Determine the classes based on place
    const placeClasses = isFirst ? 'font-bold text-blackmain' : 'text-greymain';
    
    // Highlight 1st Row
    const rowBackgroundClass = isFirst ? 'bg-second' : '';

    // Add '$' and Check for 'NTD' (0.00)
    const formattedWOdds = (isFirst && wOdds !== null) 
        ? `$${wOdds.toFixed(2)}` 
        : '';

    let formattedPOdds = '';
    if (place <= 3 && pOdds !== null) {
        if (pOdds === 0.00) {
            formattedPOdds = 'NTD';
        } else {
            formattedPOdds = `$${pOdds.toFixed(2)}`;
        }
    }

    return (
        // 💡 CHANGE 1: Increased row height by changing py-1 to py-2
        <div 
            className={`grid grid-cols-12 items-center text-sm  py-3 '} ${rowBackgroundClass}`}
        >
            
            {/* 1. Place Text - col-span-2 (Now only contains placeText, isolated) */}
            <div className="col-span-2 pl-6">
                {/* Ordinal Place Text */}
                <span className={`font-semibold text-sm uppercase ${placeClasses}`}>
                    {placeText}
                </span>
            </div>
            
            {/* 2. Runner No. & Runner Name - col-span-6 (Runner No. moved here) */}
            <div className="col-span-6 truncate text-blackmain text-sm font-medium flex items-center space-x-1">
                {/* Runner Number */}
                {runnerNo !== null && <span className="font-extrabold text-sm text-blackmain pr-2">{runnerNo}.</span>}
                {/* Runner Name */}
                <span className="truncate">{runnerName}</span> 
            </div>
            
            {/* 3. Win Odds - col-span-2 (Now uses formattedWOdds with '$') */}
            <div className="col-span-2 text-right text-sm  text-blackmain pr-2">
                {formattedWOdds}
            </div>

            {/* 4. Place Odds - col-span-2 (Now uses formattedPOdds with '$' or 'NTD') */}
            <div className="col-span-2 text-right text-sm  text-blackmain pr-6">
                {formattedPOdds}
            </div>
        </div>
    );
}

// --- END OF TEMPORARY STUBS ---


interface RacecardProps {
    raceResults: RaceResultDetail[];
    nextToJumpIndex: number; 
}

// The export is correct.
export function Racecard({ raceResults, nextToJumpIndex }: RacecardProps) {
    return (
        <div className="w-full">
            {/* 🏁 RACE LIST AND RESULTS SECTION 🏁 */}
            {/* Header (UNCHANGED) */}
            <div className="flex items-center justify-between p-4 bg-blackmain text-white rounded-t-2xl mt-10">
                
                {/* Left side: Icon and Heading */}
                <div className="flex items-center space-x-3">
                    <span className="material-symbols-outlined text-3xl">
                        List_Alt
                    </span>

                    <h2 className="text-2xl font-heading font-semibold">
                        Racecard
                    </h2>
                </div>

                {/* Right side: Badge */}
                <span className="flex items-center justify-center h-8 w-8 rounded-4px bg-white text-blackmain text-base font-bold  flex-shrink-0">
                    {raceResults.length}
                </span>
            </div>

            {/* Race List */}
            <ul className="grid grid-cols-1 gap-12 lg:gap-4 lg:grid-cols-2 mb-10 items-start">
                {raceResults.map((race, index) => {
                    
                    let statusText: 'RESULT' | 'NEXT TO JUMP' | null = null;
                    let statusClasses = '';
                    
                    if (hasResults(race)) { 
                        statusText = 'RESULT';
                        statusClasses = 'bg-green-100 text-green-800';
                    } else if (index === nextToJumpIndex && index !== -1) {
                        statusText = 'NEXT TO JUMP';
                        statusClasses = 'bg-pink-100 text-pink-800';
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
                            {/* Removed space-y-3 to reduce gap between header and first result */}
                            <div className="flex flex-col"> 
                                
                                {/* Race Header: Number, Notes, Status Badge */}
                                <div className="flex items-center justify-between border-b p-2 bg-mainlight p-2">
                                    
                                    {/* Left Side: Race Number and Race Notes */}
                                    <div className="flex items-center space-x-3 min-w-0 overflow-hidden">
                                        {/* Race No Box */}
                                        <span className="text-xl font-heading font-extrabold text-blackmain px-2 py-0.5 bg-white border-2 border border-black flex-shrink-0">
                                            {race.race_no}
                                        </span>
                                        {/* Race Notes */}
                                        {race.race_notes && (
                                            <span className="text-sm text-blackmain truncate mr-4">
                                                {race.race_notes}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Status Indicator */}
                                    {statusText && (
                                        <span className={`text-xs font-bold px-3 py-1 flex-shrink-0 rounded-full ${statusClasses}`}>
                                            {statusText}
                                        </span>
                                    )}
                                </div>

                                {/* Conditional Display: Results vs. Full Race Card */}
                                {hasResults(race) ? (
                                    // **1. DISPLAY RESULTS (USING UPDATED ResultsRow)**
                                    // p-0 allows the highlight to span full width
                                    <div className="p-0 divide-y divide-greymain"> 
                                        
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
                                            pOdds={null} 
                                            isFirst={false}
                                            isLast={true} 
                                        /> 

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
                                                    
                                                    {/* 1. RUNNER NO. - col-span-2 */}
                                                    <div className="col-span-2 font-medium text-gray-800 pr-1">
                                                        <span className="font-extrabold text-blackmain mr-1 text-lg pl-6">
                                                            {runner.runner_no}.
                                                        </span>
                                                    </div>

                                                    {/* 2. RUNNER NAME + DETAILS - col-span-8 */}
                                                    <div className="col-span-8 font-medium text-blackmain pl-0 pr-2">
                                                        
                                                        {/* Row 1: Runner Name + Barrier */}
                                                        <div className="flex items-baseline">
                                                            <span className="text-blackmain ">
                                                                {runner.runner_name} 
                                                            </span>
                                                            <span className="text-greymain font-normal ml-2 text-xs flex-shrink-0">
                                                                ({runner.runner_barrier !== null ? runner.runner_barrier : 'Scr'})
                                                            </span>
                                                        </div>

                                                        {/* Row 2: Form, Jockey, and Weight */}
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
                                                    
                                                    {/* 3. TIPSTER COUNT - col-span-2 */}
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