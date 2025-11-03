// MyTipsSection.tsx (New File)

// Import the necessary types from your main route file for strong typing
import type { TipDetail } from "./comps.$comp_id.$comp_raceday_id";

interface MyTipsSectionProps {
    userTips: TipDetail[];
}

export function MyTipsSection({ userTips }: MyTipsSectionProps) {
    return (
        // 🛑 MODIFIED: Added w-full (mobile default) and lg:max-w-1/2 lg:mx-auto for centering on desktop
        <div className="mt-10 w-full">
            
            <div className="flex items-center space-x-3 p-4 bg-main text-white rounded-t-2xl">
                <span className="material-symbols-outlined text-3xl">
                    Checkbook
                </span>

                <h2 className="text-2xl font-heading font-semibold">
                    My Tips
                </h2>

            </div>

            {userTips.length === 0 ? (
                <p className="text-gray-500 italic font-body mb-8 p-4 bg-gray-50 rounded-b-2xl border border-gray-100 border-t-0 shadow-lg">
                    You have not submitted any tips for this raceday yet.
                </p>
            ) : (
                <div className="mb-10  border border-gray-100 border-t-0 rounded-b-2xl overflow-hidden shadow-lg">
                    
                    {/* Table Header - Now 2 columns (RACE: 2/12, SELECTION: 10/12) */}
                    <div className="grid grid-cols-12 text-xs font-semibold uppercase text-blackmain p-3 bg-second">
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
                                <div className="col-span-2 text-lg font-extrabold text-main text-lef pl-4">
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