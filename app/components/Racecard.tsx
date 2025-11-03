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
    return form.slice(-5);
};

// 3. Stub for ResultsRow Component (Minimal signature to compile)
// NOTE: This must match the props used in the original code.
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
    // 🛑 This is a minimal placeholder to prevent the 'undefined' error. 
    // You should move the full ResultsRow component logic here or import it.
    return (
        <div className="text-sm py-1">
            {place} - {runnerName} ({runnerNo})
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
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-custom text-white rounded-t-2xl mt-10">
                
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
                <span className="flex items-center justify-center h-8 w-8 rounded-4px bg-white text-main text-base font-bold  flex-shrink-0">
                    {raceResults.length}
                </span>
            </div>

            {/* Race List */}
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-10">
                {raceResults.map((race, index) => {
                    
                    let statusText: 'RESULT' | 'NEXT TO JUMP' | null = null;
                    let statusClasses = '';
                    
                    // You must have the hasResults function available in scope for this to work
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
                                    // **2. DISPLAY FULL RUNNER LIST (COLUMN ORDER SWAPPED)**
                                    <div className="pt-1">
                                        
                                        {/* 🛠️ UPDATED Column Labels: TIPS MOVED TO END */}
                                        <div className="grid grid-cols-12 text-xs font-semibold uppercase text-gray-500 border-b pb-1 mb-1">
                                            {/* 1. No. Form */}
                                            <div className="col-span-2">No. Form</div> 
                                            
                                            {/* 2. Runner (Bar) Weight */}
                                            <div className="col-span-4 pl-1">Runner (Bar) Weight</div>
                                            
                                            {/* 3. JOCKEY (NOW IN THIRD SPOT) */}
                                            <div className="col-span-4 text-right">Jockey</div>
                                            
                                            {/* 4. TIPS (NOW IN LAST SPOT) */}
                                            <div className="col-span-2 text-center">Tips</div>
                                        </div>
                                    
                                        <div className="space-y-1"> 
                                            {race.allRunners?.map((runner) => (
                                                <div key={runner.runner_no} className="grid grid-cols-12 items-center text-sm border-b border-gray-100 last:border-b-0 py-0.5">
                                                    
                                                    {/* 1. RUNNER NO. + FORM - col-span-2 */}
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

                                                    {/* 2. RUNNER NAME + BARRIER + WEIGHT - col-span-4 */}
                                                    <div className="col-span-4 font-medium text-gray-800 truncate pl-1 pr-2">
                                                        
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
                                                    
                                                    {/* 3. JOCKEY - col-span-4 (MOVED HERE) */}
                                                    <div className="col-span-4 text-gray-700 text-xs truncate text-right pr-1">
                                                        {runner.runner_jockey || 'N/A'}
                                                    </div>

                                                    {/* 4. TIPSTER COUNT - col-span-2 (MOVED TO END) */}
                                                    <div className="col-span-2 text-center">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${runner.tipster_count && runner.tipster_count > 0 ? 'bg-indigo-100 text-indigo-700' : 'text-gray-300'}`}>
                                                            {runner.tipster_count || 0}
                                                        </span>
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
        </div>
    );
}