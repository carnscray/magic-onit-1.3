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
    
    // Case 1: All races are complete
    if (nextToJumpIndex === -1) {
        // 🛑 MODIFIED: Updated completed state styling
        return (
            <div className="p-4 bg-white rounded-2xl shadow-lg border border-green-300">
                <p className="font-heading font-extrabold text-xl text-main flex items-center space-x-3">
                    <span className="material-symbols-outlined text-main text-3xl">
                        check_circle
                    </span>
                    <span>Day Complete! 🏁</span>
                </p>
                <p className="text-sm text-gray-500 mt-2 pl-9">All race results have been posted for the {racedayHeader.raceday_name} meeting.</p>
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
    const uniqueSubTips = nextRace.uniqueSubTips || []; 
    // const runnerCount = runners.length || '??'; // Removed as requested
    const raceNotes = nextRace.race_notes || 'No special notes or prize money details available.';
    
    // Determine the max tip count to scale the visual bar correctly
    const maxTipCount = runners.reduce((max, runner) => {
        return Math.max(max, runner.tipster_count || 0);
    }, 0);


    return (
        // 🛑 MODIFIED: New wrapper for consistent shadow/border
        <div className="shadow-lg rounded-2xl overflow-hidden">
            

            <div className="flex items-center justify-between p-4 bg-gradient-custom text-white rounded-t-2xl">
                
                {/* Left side: Icon and Heading */}
                <div className="flex items-center space-x-3">
                    <span className="material-symbols-outlined text-3xl">
                        schedule
                    </span>

                    <h2 className="text-2xl font-heading font-semibold">
                        Next To Jump
                    </h2>
                </div>
                
                {/* Right side: Race Number */}
                <h2 className="text-2xl font-heading font-semibold">
                    Race {nextRace.race_no}
                </h2>
            </div>

            {/* Content Container */}
            <div className="divide-y divide-greymain bg-white rounded-b-2xl pb-8">
                
                {/* 🛑 MODIFIED: Full-width Race Details Bar */}
                {/* Added bg-second and used -mx-4 to go edge-to-edge. Changed internal padding. */}
                <div className="flex items-center justify-between bg-mainlight -mx-4 px-4 py-3">

                <p className="text-sm font-body text-blackmain text-left whitespace-nowrap overflow-hidden text-ellipsis pl-4 pr-4">
                        {raceNotes}
                    </p>
                </div>

                
                {/* --- TIPSTER MARKET CONSENSUS SECTION --- */}
                {runners.length > 0 && (
                    // 🛑 MODIFIED: border-red-200 changed to border-gray-200
                    <div className="mt-0 pt-4 ">
                        {/* 🛑 MODIFIED: Title/Icon color changed to text-main */}
                        <h4 className="text-md font-heading font-bold text-main mb-2 flex items-center space-x-1 pl-4">
                            <span className="material-symbols-outlined text-main text-xl">
                                bar_chart
                            </span>
                            <span>Tipster Market Consensus</span>
                        </h4>

                        <div className="space-y-2">
                            {runners
                                // 🛑 NEW: Sort runners by tip count (descending)
                                .sort((a, b) => (b.tipster_count || 0) - (a.tipster_count || 0))
                                .map(runner => {
                                const tipCount = runner.tipster_count || 0;
                                // Calculate percentage width for the visual bar
                                const tipPercentage = maxTipCount > 0 ? (tipCount / maxTipCount) * 100 : 0;
                                
                                return (
                                    <div key={runner.runner_no} className="flex items-center text-sm pl-4 pr-6 ">
                                        {/* Runner Name/No Column */}
                                        <div className="w-8/12 flex items-center pr-2">
                                            {/* 🛑 MODIFIED: Runner No color changed to text-main */}
                                            <span className="font-extrabold text-main mr-1 text-sm w-5 text-right flex-shrink-0">
                                                {runner.runner_no}.
                                            </span>
                                            <span className="truncate text-blackmain font-medium pl-2 ">
                                                {runner.runner_name}
                                            </span>
                                        </div>
                                        
                                        {/* Tip Count & Bar Column */}
                                        <div className="w-4/12 flex items-center space-x-2">
                                            
                                            {/* 🛑 MODIFIED: Bar Track/Fill colors changed to gray-100/bg-main */}
                                            <div className="h-2 flex-grow bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-main rounded-full transition-all duration-300 ease-out" 
                                                    style={{ width: `${tipPercentage}%` }}
                                                />
                                            </div>
                                            
                                            {/* Count */}
                                            <span className={`font-bold text-xs flex-shrink-0 w-4 text-right ${tipCount === maxTipCount && tipCount > 0 ? 'text-main' : 'text-mainlight'}`}>
                                                {tipCount}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {/* --- UNIQUE SUB TIPS SECTION --- */}
                {uniqueSubTips.length > 0 && (
                    // 🛑 MODIFIED: border-red-200 changed to border-gray-200
                    <div className="mt-4 pt-4 pl-4 pr-4">
                        
                        {/* 🛑 NEW: Title for Sub-Tips section */}
                        <h4 className="text-md font-heading font-bold text-main mb-2 flex items-center space-x-1">
                            <span className="material-symbols-outlined text-main text-xl">
                                Sync_Alt
                            </span>
                            <span>Substitutions</span>
                        </h4>

                        {/* 🛑 MODIFIED: bg-red-100/border-red-200 changed to gray-100/gray-200 */}
                        <ul className="text-sm space-y-1 bg-mainlight p-3 rounded-lg border border-gray-200">
                            {uniqueSubTips.map((combo, index) => (
                                <li key={index} className="text-main">
                                    {/* Main Runner -  */}
                                    <span className="font-semibold text-alert">
                                        {combo.main_runner_no}. {combo.main_runner_name}
                                    </span>
                                    
                                    
                                    <span className="font-semibold text-mainblack mx-2">
                                        &gt; SUB:
                                    </span>
                                    
                                    {/* Alternate Runner  */}
                                    <span className="font-semibold text-main">
                                        {combo.alt_runner_no}. {combo.alt_runner_name}
                                    </span>
                                </li>
                            ))}
                        </ul>

                    </div>
                )}
                {/* --------------------------------------------------- */}
            </div>
        </div>
    );
}