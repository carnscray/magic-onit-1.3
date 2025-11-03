// Comp_RacedayLive.tsx (Updated with Banner Header and LIVE Badge)

import { Link } from "@remix-run/react"; 
import type { RacedayData } from "./$comp_id"; 

// Prop definition
type CompRacedayLiveProps = {
    racedays: RacedayData[];
};

// Helper to format the date (extracted with the JSX)
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
};

export default function CompRacedayLive({ racedays }: CompRacedayLiveProps) {
    
    // 💡 NEW LOGIC: Determine the background color for the LIVE badge
    // Red if there are racedays (LIVE), Grey if there are none.
    const liveBadgeClass = racedays.length > 0 
        ? 'bg-red-600' // Red for LIVE
        : 'bg-gray-500'; // Grey for inactive
        
    return (
        // Added margin, border, shadow, and overflow-hidden for the banner effect
        <section className="my-12 rounded-2xl shadow-xl overflow-hidden">
            
            {/* ========================================================== */}
            {/* 🏁 RACEDAYS SECTION HEADER (UPDATED BANNER STYLE) 🏁 */}
            {/* ========================================================== */}
            
            <div className="flex items-center justify-between space-x-3 p-4 bg-gradient-customalt text-white rounded-t-2xl">
                
                {/* Left side: Icon and Title (Now just "Racedays") */}
                <div className="flex items-center space-x-3">
                    <span className="material-symbols-outlined text-3xl">
                        Newsmode
                    </span>
                    
                    <h2 className="text-2xl font-heading font-semibold">
                        Racedays 
                    </h2>
                </div>
                
                {/* 💡 CHANGE 1: Right side now contains the LIVE badge and the Raceday Count badge */}
                <div className="flex items-center space-x-2"> 
                    
                    {/* LIVE Badge (Red Box with White Writing) */}
                    <span className={`text-sm font-bold px-2 py-1 rounded-full text-white shadow-md ${liveBadgeClass}`}>
                        LIVE
                    </span>

                    {/* Raceday Count Badge */}
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white text-indigo-700 text-base font-bold shadow-md flex-shrink-0">
                        {racedays.length}
                    </span>
                </div>
            </div>
            
            {/* Wrap the content in a padded white container (p-6 for spacing consistency) */}
            <div className="p-6 bg-white"> 
                {racedays.length === 0 ? (
                    <p className="text-gray-500 italic font-body">
                        This competition has no scheduled racedays yet.
                    </p>
                ) : (
                    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {racedays.map((raceday) => (
                            <li 
                                key={raceday.comp_raceday_id} 
                                className="p-4 bg-white shadow-lg rounded-lg border border-gray-100 hover:shadow-xl transition-shadow"
                            >
                                <Link to={`${raceday.comp_raceday_id}`}>
                                    <div className="flex justify-between items-start">
                                        
                                        {/* --- LEFT SIDE: Raceday Details --- */}
                                        <div>
                                            <p className="text-sm font-heading font-semibold text-gray-500 uppercase">
                                                {raceday.racetrack_name}
                                            </p>
                                            <p className="text-lg font-heading font-bold text-gray-800">
                                                {raceday.raceday_name}
                                            </p>
                                            <p className="text-sm font-body text-gray-500 mt-1">
                                                {formatDate(raceday.raceday_date)}
                                            </p>
                                        </div>

                                        {/* --- RIGHT SIDE: LocRef and Race Count --- */}
                                        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                            <span className="text-sm font-bold text-gray-600">
                                                {raceday.racetrack_locref}
                                            </span>
                                            <span className="flex items-center justify-center h-8 w-8 bg-pink-500 text-white text-base font-bold shadow-md">
                                                {raceday.race_count}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}