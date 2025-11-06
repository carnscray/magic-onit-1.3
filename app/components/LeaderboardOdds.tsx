// app/components/LeaderboardOdds.tsx

import React, { useState } from 'react'; 
// Use the unified type from the route file
import type { TipsterLeaderboardEntry } from "~/routes/comps.$comp_id.$comp_raceday_id"; 

interface LeaderboardOddsProps {
    // 🛑 UPDATED: Use the unified type for the incoming data
    leaderboardData: TipsterLeaderboardEntry[];
    // 🛑 NEW PROP: ID of the currently logged-in user
    currentTipsterId: number; 
}

// Number of rows to display initially and add per 'Load More' click
const INITIAL_ROWS = 6; // Matching LeaderboardPoints change
const ROWS_PER_LOAD = 10; // Matching LeaderboardPoints change

/**
 * Helper function to convert a number to its ordinal string (e.g., 1 -> 1st, 2 -> 2nd).
 */
const getOrdinal = (n: number): string => {
    if (n > 3 && n < 21) return n + 'th'; 
    switch (n % 10) {
        case 1:  return n + "st";
        case 2:  return n + "nd";
        case 3:  return n + "rd";
        default: return n + "th";
    }
};

/**
 * Helper function to format the odds value as currency (e.g., $123.45)
 */
const formatCurrency = (n: number): string => {
    // Assuming AUD for the sake of example, adjust currency code as needed
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD', 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
};


const LeaderboardOdds: React.FC<LeaderboardOddsProps> = ({ leaderboardData, currentTipsterId }) => {
    
    // 1. Sort Data by Odds Return (Descending)
    const sortedData = [...leaderboardData].sort((a, b) => 
        b.odds_total_return - a.odds_total_return || 
        a.tipster_nickname.localeCompare(b.tipster_nickname) // Secondary sort by nickname
    );

    const hasData = sortedData && sortedData.length > 0;

    // 🛑 STATE: Track how many rows are currently visible
    const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);

    // 2. Calculate Dense Rank (1, 1, 3, 4, 4, 6)
    const rankedData: (TipsterLeaderboardEntry & { rank: number })[] = [];
    let denseRank = 1;
    let lastOdds = Infinity; // Start high for descending rank calculation

    for (let i = 0; i < sortedData.length; i++) {
        const row = sortedData[i];

        // Rank changes only if the odds_total_return is lower than the previous
        if (row.odds_total_return < lastOdds) {
            denseRank = i + 1;
        }

        rankedData.push({
            ...row,
            rank: denseRank
        });
        
        lastOdds = row.odds_total_return;
    }
    
    // 🛑 DERIVED STATE: Slice the data to show only the visible rows
    const dataToDisplay = rankedData.slice(0, visibleRows);
    const hasMore = rankedData.length > visibleRows;
    const remainingRows = rankedData.length - visibleRows;

    // 🛑 HANDLER: Function to load the next batch of rows
    const handleLoadMore = () => {
        setVisibleRows(prevVisibleRows => prevVisibleRows + ROWS_PER_LOAD);
    };
    
    const staticRankBadgeClasses = "inline-flex items-center justify-center font-bold h-8 px-3 text-lg text-main";


    return (
        <div className="shadow-lg rounded-2xl overflow-hidden">
            
            {/* Header: bg-main, text-white, rounded-t-2xl */}
            <div className="flex items-center space-x-3 p-4 bg-gradient-custom text-white rounded-t-2xl">
                <span className="material-symbols-outlined text-3xl">
                    Rewarded_Ads

                </span>
                <h2 className="text-2xl font-heading font-semibold">
                    Leaderboard Odds
                </h2>
            </div>
            
            {/* Content Section */}
            <div className="p-0 bg-white rounded-b-2xl border border-gray-100 border-t-0">
                
                {!hasData && (
                    <p className="text-gray-500 italic p-4">No odds return recorded yet. Results will appear here after the Comp Admin finalizes a race.</p>
                )}

                {hasData && (
                    <div className="divide-y divide-gray-200">
                        {/* GRID HEADER: Column spans: 2, 8, 2 */}
                        <div className="grid grid-cols-12 text-xs font-bold uppercase tracking-wider text-blackmain p-1 bg-mainlight">
                            {/* col-span-2: Rank */}
                            <div className="col-span-2 pl-4 py-2">Rank</div> 
                            {/* col-span-8: Tipster */}
                            <div className="col-span-8 py-2">Tipster</div>
                            {/* col-span-2: Odds */}
                            <div className="col-span-2 text-right pr-5 py-2">Odds</div>
                        </div>

                        {/* 🛑 TIPSTER ROWS: Map over dataToDisplay */}
                        {dataToDisplay.map((row) => {
                            // Determine text color based on positive/negative odds return
                            const oddsColorClass = row.odds_total_return >= 0 ? 'text-main' : 'text-red-600';
                            
                            // 🛑 NEW: Check if this row belongs to the current user
                            const isCurrentUser = row.tipster_id === currentTipsterId;

                            // 🛑 NEW: Conditional classes
                            const rowClasses = isCurrentUser 
                                ? "bg-second" // Highlighted class
                                : "hover:bg-gray-50 transition duration-100";

                            return (
                                <div 
                                    key={row.tipster_id} 
                                    className={`grid grid-cols-12 items-center py-3 px-4 ${rowClasses}`} 
                                >
                                    {/* 1. Rank Column (col-span-2) */}
                                    <div className="col-span-2 -ml-1">
                                        <span 
                                            className={staticRankBadgeClasses} 
                                        >
                                            {getOrdinal(row.rank)} 
                                        </span>
                                    </div>
                                    
                                    {/* 2. Tipster Column (col-span-8) */}
                                    <div className="col-span-8">
                                        <div className="flex items-center space-x-3">
                                            
                                            {/* Gray Circle Placeholder */}
                                            <div className="w-12 h-12 rounded-full bg-mainlight flex-shrink-0">
                                                {/* Future: <img src={row.tipster_mainpic} ... /> */}
                                            </div>

                                            {/* min-w-0 ensures the flex item can shrink, allowing truncate to work */}
                                            <div className="min-w-0 mr-2"> 
                                                <div className="text-base font-medium text-blackmain whitespace-normal break-words">
                                                    {row.tipster_nickname}
                                                </div>
                                                <div className="text-sm text-greymain mr-4">
                                                    {row.tipster_slogan}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* 3. Odds Total Column (col-span-2) */}
                                    <div className="col-span-2 text-sm font-bold text-right pr-3">
                                        <span className={`text-lg font-heading ${oddsColorClass}`}>
                                            {formatCurrency(row.odds_total_return)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* 🛑 LOAD MORE BUTTON */}
                        {hasMore && (
                            <div className="flex justify-center p-4 bg-gray-50">
                                <button
                                    onClick={handleLoadMore}
                                    className="text-main hover:text-main-dark font-bold text-sm transition duration-150"
                                >
                                    {`Load more... (${remainingRows} remaining)`}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export { LeaderboardOdds };