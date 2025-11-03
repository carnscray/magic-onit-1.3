// MyTipsSection.tsx (Final Update)

// Import the necessary types from your main route file for strong typing
import type { TipDetail } from "./comps.$comp_id.$comp_raceday_id";

interface MyTipsSectionProps {
    userTips: TipDetail[];
}

export function MyTipsSection({ userTips }: MyTipsSectionProps) {
    return (
        <div className="w-full">
            
            <div className="flex items-center space-x-3 p-4 bg-gradient-custom text-white rounded-t-2xl">
                <span className="material-symbols-outlined text-3xl">
                    Checkbook
                </span>

                <h2 className="text-2xl font-heading font-semibold">
                    My Tips
                </h2>

            </div>

            {userTips.length === 0 ? (
                <p className="text-greymain italic font-body mb-8 p-4 bg-gray-50 rounded-b-2xl border border-gray-100 border-t-0 shadow-lg">
                    You have not submitted any tips for this raceday yet.
                </p>
            ) : (
                <div className="divide-y divide-greymain mb-10  border border-gray-100 border-t-0 rounded-b-2xl overflow-hidden shadow-lg pb-4">
                    
                    {/* Table Header - Now 2 columns (RACE: 2/12, SELECTION: 10/12) */}
                    <div className="grid grid-cols-12 text-xs font-bold uppercase tracking-wider text-blackmain p-3 bg-mainlight">
                        <div className="col-span-2 text-left">RACE</div>
                        <div className="col-span-10 text-left">SELECTION</div>
                    </div>

                    {/* Tip Rows */}
                    {userTips.map((tip, index) => {
                        
                        // Main Runner details
                        const mainRunnerNo = tip.tip_main;
                        const mainRunnerName = tip.tip_main_details?.runner_name || 'Name N/A';
                        
                        // Alt Runner (SUB) details
                        const altRunnerNo = tip.tip_alt;
                        const altRunnerName = tip.tip_alt_details?.runner_name || 'Name N/A';
                        
                        // Combined display string if no sub tip exists
                        const defaultDisplay = `${mainRunnerNo}. ${mainRunnerName}`;

                        return (
                            <div
                                key={index}
                                className="grid grid-cols-12 items-center text-sm py-2 hover:bg-gray-50 transition duration-100"
                            >
                                {/* 1. RACE - 2/12 width */}
                                <div className="col-span-2 text-lg font-extrabold text-main text-lef pl-4">
                                    {tip.race_no}
                                </div>
                                
                                {/* 2. RUNNER (Combined Tip) - 10/12 width */}
                                <div className="col-span-10 text-gray-800 font-medium truncate">
                                    
                                    {/* Conditional rendering based on the presence of a Sub Tip (altRunnerNo) */}
                                    {altRunnerNo ? (
                                        <>
                                            {/* Case 1: Sub Tip Exists (Apply Split Colors) */}
                                            
                                            {/* Main Tip in text-alert */}
                                            <span className="font-bold text-alert">
                                                {mainRunnerNo}. {mainRunnerName}
                                            </span>
                                            
                                            {/* Separator */}
                                            <span className="text-main font-semibold mx-2 font-normal">
                                                &gt; SUB:
                                            </span>
                                            
                                            {/* Sub Tip Content in text-main */}
                                            <span className="font-semibold text-main">
                                                {altRunnerNo}. {altRunnerName}
                                            </span>
                                        </>
                                    ) : (
                                        /* Case 2: No Sub Tip (Render as normal) */
                                        defaultDisplay
                                    )}

                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}