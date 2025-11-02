// MyTipsSection.tsx (New File)

// Import the necessary types from your main route file for strong typing
import type { TipDetail } from "./comps.$comp_id.$comp_raceday_id";

interface MyTipsSectionProps {
    userTips: TipDetail[];
}

export function MyTipsSection({ userTips }: MyTipsSectionProps) {
    return (
        <div className="mt-10">
            
            <div className="flex items-center space-x-3 mb-4">
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
                <div className="mb-10 shadow-lg rounded-lg border border-gray-100 overflow-hidden">
                    
                    {/* Table Header - Now 2 columns (RACE: 2/12, SELECTION: 10/12) */}
                    <div className="grid grid-cols-12 text-xs font-semibold uppercase text-gray-500 bg-gray-50 p-3 border-b border-gray-100">
                        <div className="col-span-2 text-left">RACE</div>
                        <div className="col-span-10 text-left">SELECTION</div>
                    </div>

                    {/* Tip Rows */}
                    {userTips.map((tip, index) => {
                        
                        // Main Runner details
                        const mainRunnerNo = tip.tip_main;
                        const mainRunnerName = tip.tip_main_details?.runner_name || 'Name N/A';
                        
                        // Start with the main tip display
                        let combinedRunnerDisplay = `${mainRunnerNo}. ${mainRunnerName}`;
                        
                        // Alt Runner (SUB) details
                        const altRunnerNo = tip.tip_alt;
                        const altRunnerName = tip.tip_alt_details?.runner_name || 'Name N/A';
                        
                        // Append SUB tip if it exists
                        if (altRunnerNo) {
                            combinedRunnerDisplay += ` > SUB: ${altRunnerNo}. ${altRunnerName}`;
                        }

                        return (
                            <div
                                key={index}
                                className="grid grid-cols-12 items-center text-sm p-3 border-b last:border-b-0 hover:bg-gray-50 transition duration-100"
                            >
                                {/* 1. RACE - 2/12 width */}
                                <div className="col-span-2 text-lg font-extrabold text-indigo-600">
                                    {tip.race_no}
                                </div>
                                
                                {/* 2. RUNNER (Combined Tip) - 10/12 width */}
                                <div className="col-span-10 text-gray-800 font-medium truncate">
                                    {combinedRunnerDisplay}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}