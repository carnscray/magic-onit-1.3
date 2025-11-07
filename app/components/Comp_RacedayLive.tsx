// Comp_RacedayLive.tsx (Updated with Date Range Filtering)

import CompRacedayCard from "~/components/Comp_RacedayCard"; 
import type { RacedayData } from "./$comp_id"; 

// Prop definition (UNCHANGED)
type CompRacedayLiveProps = {
    racedays: RacedayData[];
};

// Helper function to normalize a date to midnight for accurate comparison
const startOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

export default function CompRacedayLive({ racedays }: CompRacedayLiveProps) {
    
    // ==========================================================
    // 💡 LIVE FILTERING LOGIC
    // ==========================================================
    
    // 1. MANUALLY SET REFERENCE DATE FOR TESTING (e.g., Nov 5, 2025)
    // NOTE: For production, you would replace this with `new Date()`
    const MANUAL_TODAY = new Date('2025-10-25'); 
    const todayStart = startOfDay(new Date());

    // 2. Define the date window boundaries: Yesterday to Today + 3 Days
    
    // START BOUNDARY: Yesterday
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1); 

    // END BOUNDARY: The 3rd day in the future (Today + 3 days)
    const futureLimitStart = new Date(todayStart);
    futureLimitStart.setDate(todayStart.getDate() + 3); 


    // 3. Filter the racedays array
    const liveRacedays = racedays.filter(raceday => {
        // Convert the raceday string date to a Date object, normalized to start of day
        const racedayDate = startOfDay(new Date(raceday.raceday_date));

        // Filter: raceday date must be >= Yesterday AND <= Future Limit (Today + 3)
        return racedayDate.getTime() >= yesterdayStart.getTime() && 
               racedayDate.getTime() <= futureLimitStart.getTime();
    });

    // ==========================================================
    // 4. Update Header Badges to use the filtered count
    // ==========================================================
    
    const liveBadgeClass = liveRacedays.length > 0 
        ? 'bg-alert' // Red for LIVE
        : 'bg-gray-500'; // Grey for inactive
        
    return (
        <section className="my-12 rounded-2xl shadow-xl overflow-hidden">
            
            {/* ... Racedays Header (UNCHANGED) ... */}
            <div className="flex items-center justify-between space-x-3 p-4 bg-gradient-custom text-white rounded-t-2xl">
                
                {/* Left side: Icon and Title */}
                <div className="flex items-center space-x-3">
                    <span className="material-symbols-outlined text-3xl">
                        Newsmode
                    </span>
                    
                    <h2 className="text-2xl font-heading font-semibold">
                        Racedays 
                    </h2>
                </div>
                
                {/* Right side: LIVE badge and Raceday Count badge */}
                <div className="flex items-center space-x-2"> 
                    
                    {/* LIVE Badge 
                    <span className={`text-sm font-bold px-2 py-1 rounded-full text-white shadow-md ${liveBadgeClass}`}>
                        LIVE
                    </span>

                    {/* Raceday Count Badge 💡 USES liveRacedays.length 
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white text-indigo-700 text-base font-bold shadow-md flex-shrink-0">
                        {liveRacedays.length}
                    </span>*/}
                </div>
            </div>
            
            {/* Wrap the content in a padded white container (p-6 for spacing consistency) */}
            <div className="p-6 bg-white"> 
                {/* 💡 CHECKS liveRacedays.length */}
                {liveRacedays.length === 0 ? (
                    <p className="text-gray-500 italic font-body">
                        This competition has no scheduled racedays in the 5-day window.
                    </p>
                ) : (
                    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* 💡 MAPS OVER liveRacedays */}
                        {liveRacedays.map((raceday) => (
                            <CompRacedayCard 
                                key={raceday.comp_raceday_id} 
                                raceday={raceday} 
                            />
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}