// app/components/LeaderboardOdds.tsx

import React from 'react';

const LeaderboardPoints = () => (
    <div className="my-8 p-4 bg-white border border-gray-200 rounded-lg shadow">
        
        {/* NEW: Updated header structure using the Checkbook icon and styling */}
        <div className="flex items-center space-x-3 mb-4 border-b pb-2">
            <span className="material-symbols-outlined text-3xl text-gray-800">
                Checkbook
            </span>

            <h2 className="text-2xl font-heading font-semibold text-gray-800">
                Leaderboard Points
            </h2>
        </div>
        
        <p className="text-gray-500 italic">Leaderboard data for odds profit will go here.</p>
    </div>
);

export { LeaderboardPoints };