// app/components/LeaderboardOdds.tsx

import React from 'react';

const LeaderboardPoints = () => (
    // Note: I removed the original wrapper styling (`my-8 p-4 bg-white border border-gray-200 rounded-lg shadow`) 
    // as the overall styling is now driven by the header and its content.
    <div className="shadow-lg rounded-2xl overflow-hidden">
        
        {/* 🛑 MODIFIED: Header now matches MyTipsSection: bg-main, text-white, rounded-t-2xl */}
        <div className="flex items-center space-x-3 p-4 bg-gradient-custom text-white rounded-t-2xl">
            <span className="material-symbols-outlined text-3xl">
                Trophy
            </span>

            <h2 className="text-2xl font-heading font-semibold">
                Leaderboard Points
            </h2>
            {/* Removed the tip count badge as it was also removed from your final MyTipsSection */}
        </div>
        
        {/* Content Section: White background, rounded-b-2xl, and padding */}
        <div className="p-4 bg-white rounded-b-2xl border border-gray-100 border-t-0">
            <p className="text-gray-500 italic">Leaderboard data for Points profit will go here.</p>
        </div>
    </div>
);

export { LeaderboardPoints };