// app/components/LeaderboardPoints.tsx

import React, { useState } from 'react'; // 🛑 Import useState
import type { TipsterLeaderboardRow } from "~/routes/comps.$comp_id.$comp_raceday_id"; 

interface LeaderboardPointsProps {
    leaderboardData: TipsterLeaderboardRow[];
}

// Number of rows to display initially and add per 'Load More' click
const INITIAL_ROWS = 6;
const ROWS_PER_LOAD = 10;

/**
 * Helper function to convert a number to its ordinal string (e.g., 1 -> 1st, 2 -> 2nd, 11 -> 11th).
 */
const getOrdinal = (n: number): string => {
    if (n > 3 && n < 21) return n + 'th'; // Catch all teens (11th, 12th, 13th)
    switch (n % 10) {
        case 1:  return n + "st";
        case 2:  return n + "nd";
        case 3:  return n + "rd";
        default: return n + "th";
    }
};

const LeaderboardPoints: React.FC<LeaderboardPointsProps> = ({ leaderboardData }) => {
    
    const hasData = leaderboardData && leaderboardData.length > 0;

    // 🛑 STATE: Track how many rows are currently visible
    const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);

    // 1. Calculate Dense Rank (1, 1, 3, 4, 4, 6)
    const rankedData: (TipsterLeaderboardRow & { rank: number })[] = [];
    let denseRank = 1;
    let lastPoints = Infinity; 

    for (let i = 0; i < leaderboardData.length; i++) {
        const row = leaderboardData[i];

        if (row.points_total < lastPoints) {
            denseRank = i + 1;
        }

        rankedData.push({
            ...row,
            rank: denseRank
        });
        
        lastPoints = row.points_total;
    }
    
    // 🛑 DERIVED STATE: Slice the data to show only the visible rows
    const dataToDisplay = rankedData.slice(0, visibleRows);
    const hasMore = rankedData.length > visibleRows;
    const remainingRows = rankedData.length - visibleRows;

    // 🛑 HANDLER: Function to load the next batch of rows
    const handleLoadMore = () => {
        setVisibleRows(prevVisibleRows => prevVisibleRows + ROWS_PER_LOAD);
    };

    // Using a simple class for all rank badges: larger text, no background/border
    const staticRankBadgeClasses = "inline-flex items-center justify-center font-bold h-8 px-3 text-lg text-gray-800";


    return (
        <div className="shadow-lg rounded-2xl overflow-hidden">
            
            {/* Header: bg-main, text-white, rounded-t-2xl */}
            <div className="flex items-center space-x-3 p-4 bg-gradient-custom text-white rounded-t-2xl">
                <span className="material-symbols-outlined text-3xl">
                    trophy
                </span>
                <h2 className="text-2xl font-heading font-semibold">
                    Leaderboard Points
                </h2>
            </div>
            
            {/* Content Section */}
            <div className="p-0 bg-white rounded-b-2xl border border-gray-100 border-t-0">
                
                {!hasData && (
                    <p className="text-gray-500 italic p-4">No points recorded yet. Results will appear here after the Comp Admin finalizes a race.</p>
                )}

                {hasData && (
                    <div className="divide-y divide-gray-200">
                        {/* GRID HEADER: Column spans: 2, 8, 2 */}
                        <div className="grid grid-cols-12 text-xs font-bold uppercase tracking-wider text-blackmain p-1 bg-mainlight">
                            {/* col-span-2: Rank */}
                            <div className="col-span-2 pl-3 py-2">Rank</div> 
                            {/* col-span-8: Tipster */}
                            <div className="col-span-8 py-2">Tipster</div>
                            {/* col-span-2: Points */}
                            <div className="col-span-2 text-right pr-3 py-2">Points</div>
                        </div>

                        {/* 🛑 TIPSTER ROWS: Map over dataToDisplay */}
                        {dataToDisplay.map((row) => {
                            return (
                                <div 
                                    key={row.tipster_id} 
                                    className={`grid grid-cols-12 items-center hover:bg-gray-50 transition duration-100 py-3 px-4`} 
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
                                            <div className="w-12 h-12 rounded-full bg-gray-300 flex-shrink-0">
                                                {/* Future: <img src={row.tipster_mainpic} ... /> */}
                                            </div>

                                            {/* min-w-0 ensures the flex item can shrink, allowing truncate to work */}
                                            <div className="min-w-0"> 
                                                <div className="text-base font-medium text-gray-800">
                                                    {row.tipster_nickname}
                                                </div>
                                                <div className="text-sm text-gray-500 truncate">
                                                    {row.tipster_slogan}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* 3. Points Total Column (col-span-2) */}
                                    <div className="col-span-2 text-sm font-bold text-right -mr-1">
                                        <span className="text-lg font-heading text-main">
                                            {Math.round(row.points_total)}
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

export { LeaderboardPoints };