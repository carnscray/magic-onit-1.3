// Comp_RacedayPast.tsx (Final Past Filter with Conditional Card Layout)

import { Link } from "@remix-run/react"; 
import type { RacedayData } from "../routes/comps.$comp_id._layout"; // Adjusted import path assumption

// Prop definition
type CompRacedayPastProps = {
    racedays: RacedayData[];
};

// Helper function to format the date for display
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
};

// Robust helper function: Parses YYYY-MM-DD string into a Date object in local time at midnight
const parseLocalDay = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); 
};


export default function CompRacedayPast({ racedays = [] }: CompRacedayPastProps) {
    
    // ==========================================================
    // PAST FILTERING & SORTING LOGIC (UNCHANGED)
    // ==========================================================
    
    const MANUAL_TODAY_STRING = '2025-10-25'; 
    const todayStart = parseLocalDay(MANUAL_TODAY_STRING);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1); 

    let pastRacedays = racedays.filter(raceday => {
        const racedayDate = parseLocalDay(raceday.raceday_date);
        return racedayDate.getTime() < yesterdayStart.getTime();
    });

    pastRacedays.sort((a, b) => {
        const dateA = parseLocalDay(a.raceday_date).getTime();
        const dateB = parseLocalDay(b.raceday_date).getTime();
        return dateB - dateA; 
    });


    return (
        <section className="my-12 rounded-2xl shadow-xl overflow-hidden">
            
            {/* Header (UNCHANGED) */}
            <div className="flex items-center justify-between space-x-3 p-4 bg-gradient-custom text-white rounded-t-2xl">
                <div className="flex items-center space-x-3">
                    <span className="material-symbols-outlined text-3xl">history</span>
                    <h2 className="text-2xl font-heading font-semibold">Past Racedays</h2>
                </div>

            </div>
            
            {/* Content Container */}
            <div className="p-6 bg-white"> 
                {pastRacedays.length === 0 ? (
                    <p className="text-gray-500 italic font-body">
                        No racedays have been completed for this competition yet.
                    </p>
                ) : (
                    <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {pastRacedays.map((raceday) => (
                            <li 
                                key={raceday.comp_raceday_id} 
                                // 🛑 MODIFIED: List item is now just a relative wrapper
                                className="relative"
                            >
                                <Link 
                                    to={`${raceday.comp_raceday_id}`}
                                    // 🛑 MODIFIED: Link wraps the content and holds the visual styling + interaction
                                    className="p-4 bg-white shadow-lg rounded-lg border border-gray-100 block w-full h-full 
                                               transition-all duration-200 hover:shadow-xl hover:bg-mainlight 
                                               active:bg-second active:scale-[0.9] transform"
                                >
                                    
                                    {/* NEW CARD LAYOUT */}
                                    <div className="flex items-start space-x-4">
                                        
                                        {/* 1. LocRef Block (Far Left) */}
                                        <div className="flex-shrink-0 flex items-center justify-center min-w-[3rem] 
                                                        bg-white border-2 border-main"> 
                                            <p className="text-lg font-heading font-extrabold text-main uppercase py-2.5 px-2">
                                                {raceday.racetrack_locref}
                                            </p>
                                        </div>

                                        {/* 2. Main Details Container */}
                                        <div className="flex-grow min-w-0 flex flex-col justify-start">
                                            
                                            {/* 2a. Date (Text size lg, no border) */}
                                            <p className="text-sm font-body text-blackmain uppercase">
                                                {formatDate(raceday.raceday_date)}
                                            </p>
                                            
                                            {/* 2b. Raceday Name and Track Name (Single line, Text size lg) */}
                                            <p className="text-lg font-heading  text-blackmain truncate mt-0"> 
                                                {/* Raceday Name */}
                                                <span className="font-bold">
                                                     {raceday.raceday_name}
                                                </span>
                                                {/* Separator and Track Name */}
                                                <span className="text-sm text-blackmain uppercase ml-1"> 
                                                    | {raceday.racetrack_name}
                                                </span>
                                            </p>
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