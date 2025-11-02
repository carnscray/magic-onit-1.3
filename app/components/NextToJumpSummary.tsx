// ~/components/NextToJumpSummary.tsx

// Import the necessary types from the main route file
import { 
    RaceResultDetail, 
    RacedayHeaderData,
    SubTipCombo // 💡 NEW IMPORT
} from "~/routes/comps.$comp_id.$comp_raceday_id";

// Define props for the component
interface NextToJumpSummaryProps {
    racedayHeader: RacedayHeaderData; 
    raceResults: RaceResultDetail[];
    nextToJumpIndex: number; 
}

/**
 * A summary card displaying the next race to jump, or a message if the day is complete.
 */
export function NextToJumpSummary({ 
    racedayHeader, 
    raceResults, 
    nextToJumpIndex 
}: NextToJumpSummaryProps) {
    
    // Case 1: All races are complete (UNCHANGED)
    if (nextToJumpIndex === -1) {
        return (
            <div className="bg-white p-5 mb-10 rounded-xl shadow-lg border border-green-200">
                <p className="font-heading font-bold text-lg text-green-700 flex items-center space-x-2">
                    <span className="material-symbols-outlined text-green-600">
                        check_circle
                    </span>
                    <span>Day Complete! 🏁</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">All race results have been posted for the {racedayHeader.raceday_name} meeting.</p>
            </div>
        );
    }

    // Case 2: A race is next to jump
    const nextRace = raceResults[nextToJumpIndex];

    if (!nextRace) {
        return null;
    }

    // Get data for the summary
    const runners = nextRace.allRunners || [];
    const uniqueSubTips = nextRace.uniqueSubTips || []; // 💡 NEW: Get the list of subs
    const runnerCount = runners.length || '??';
    const raceNotes = nextRace.race_notes || 'No special notes or prize money details available.';
    
    // Determine the max tip count to scale the visual bar correctly
    const maxTipCount = runners.reduce((max, runner) => {
        return Math.max(max, runner.tipster_count || 0);
    }, 0);


    return (
        <div className="bg-red-50 p-6 mb-10 rounded-xl shadow-lg border-2 border-red-400">
            {/* Header Section (UNCHANGED) */}
            <div className="flex items-start justify-between border-b border-red-200 pb-3 mb-3">
                
                <h3 className="text-xl font-heading font-extrabold text-red-700 flex items-center space-x-3">
                    <span className="material-symbols-outlined text-red-600 text-3xl">
                        schedule
                    </span>
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-lg font-semibold uppercase">NEXT TO JUMP:</span>
                        <span className="text-2xl font-extrabold">Race {nextRace.race_no}</span>
                    </div>
                </h3>

                <div className="text-right">
                    <span className="text-sm font-semibold text-red-700 bg-red-200 px-3 py-1 rounded-full shadow-inner">
                        {runnerCount} Runners
                    </span>
                    <p className="text-xs font-body text-gray-600 mt-1">
                        {racedayHeader.racetrack_name} ({racedayHeader.racetrack_locref})
                    </p>
                </div>
            </div>
            
            {/* Race Notes (UNCHANGED) */}
            <p className="text-sm font-body text-gray-700 italic mb-4">
                {raceNotes}
            </p>
            
            {/* --- TIPSTER MARKET CONSENSUS SECTION (UNCHANGED) --- */}
            {runners.length > 0 && (
                <div className="mt-4 pt-4 border-t border-red-200">
                    <h4 className="text-md font-heading font-bold text-red-700 mb-2 flex items-center space-x-1">
                        <span className="material-symbols-outlined text-red-600 text-xl">
                            bar_chart
                        </span>
                        <span>Tipster Market Consensus</span>
                    </h4>

                    <div className="space-y-1">
                        {runners.map(runner => {
                            const tipCount = runner.tipster_count || 0;
                            // Calculate percentage width for the visual bar
                            const tipPercentage = maxTipCount > 0 ? (tipCount / maxTipCount) * 100 : 0;
                            
                            return (
                                <div key={runner.runner_no} className="flex items-center text-sm">
                                    {/* Runner Name/No Column */}
                                    <div className="w-8/12 flex items-center pr-2">
                                        <span className="font-extrabold text-red-600 mr-1 text-sm w-5 text-right flex-shrink-0">
                                            {runner.runner_no}.
                                        </span>
                                        <span className="truncate text-gray-700 font-medium">
                                            {runner.runner_name}
                                        </span>
                                    </div>
                                    
                                    {/* Tip Count & Bar Column */}
                                    <div className="w-4/12 flex items-center space-x-2">
                                        
                                        {/* Bar */}
                                        <div className="h-2 flex-grow bg-red-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-red-400 rounded-full transition-all duration-300 ease-out" 
                                                style={{ width: `${tipPercentage}%` }}
                                            />
                                        </div>
                                        
                                        {/* Count */}
                                        <span className={`font-bold text-xs flex-shrink-0 w-4 text-right ${tipCount === maxTipCount && tipCount > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                                            {tipCount}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* --- UNIQUE SUB TIPS SECTION (NEW) --- */}
            {uniqueSubTips.length > 0 && (
                <div className="mt-4 pt-4 border-t border-red-200">


                    <ul className="text-sm space-y-1 bg-red-100 p-3 rounded-lg border border-red-200">
                        {uniqueSubTips.map((combo, index) => (
                            <li key={index} className="text-gray-700">
                                {/* Main Runner */}
                                <span className="font-bold text-red-700">
                                    {combo.main_runner_no}. {combo.main_runner_name}
                                </span>
                                
                                {/* Separator */}
                                <span className="font-semibold text-red-500 mx-2">
                                    &gt; SUB:
                                </span>
                                
                                {/* Alternate Runner */}
                                <span className="font-bold text-red-700">
                                    {combo.alt_runner_no}. {combo.alt_runner_name}
                                </span>
                            </li>
                        ))}
                    </ul>

                </div>
            )}
            {/* --------------------------------------------------- */}

        </div>
    );
}