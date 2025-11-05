// app/components/Comp_RacedayCard.tsx (Final Live Card Layout with Status Badge)

import { Link } from "@remix-run/react"; 
import type { RacedayData } from "../routes/comps.$comp_id"; 

// Prop definition - Reuses the RacedayData type
type CompRacedayCardProps = {
    raceday: RacedayData;
};

// --- DATE HELPER FUNCTIONS ---

// Robust helper function: Parses YYYY-MM-DD string into a Date object in local time at midnight
const parseLocalDay = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    // Month is 0-indexed in Date constructor (e.g., 10 is November)
    return new Date(year, month - 1, day); 
};

// Helper to format the date for display
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
};

// Helper to determine the status badge text and style
const getRacedayStatus = (racedayDateString: string) => {
    // 💡 NOTE: Use this for consistency with your parent component's filtering logic
    const MANUAL_TODAY_STRING = '2025-10-25'; 
    
    const racedayDate = parseLocalDay(racedayDateString);
    const today = parseLocalDay(MANUAL_TODAY_STRING);

    const dayTime = racedayDate.getTime();
    const todayTime = today.getTime();
    
    // Calculate Yesterday's time
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayTime = yesterday.getTime();

    if (dayTime === todayTime) {
        return { text: "TODAY", style: "bg-alert text-white" };
    } else if (dayTime === yesterdayTime) {
        return { text: "YESTERDAY", style: "bg-orange-500 text-white" };
    } else {
        return { text: "UPCOMING", style: "bg-indigo-600 text-white" };
    }
};


export default function CompRacedayCard({ raceday }: CompRacedayCardProps) {
    
    const status = getRacedayStatus(raceday.raceday_date);
    
    return (
        <li 
            key={raceday.comp_raceday_id} 
            className="p-4 bg-white shadow-lg rounded-lg border border-gray-100 hover:shadow-xl transition-shadow"
        >
            <Link to={`${raceday.comp_raceday_id}`}>
                
                {/* LAYOUT: LocRef + Details Container */}
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
                        
                        {/* 2a. TOP ROW: Raceday Name (Left) and Status Badge (Right) */}
                        <div className="flex justify-between items-start mb-1">
                            {/* Raceday Name (text-xl, Bold) */}
                            <p className="text-lg font-heading font-bold text-main truncate mr-2"> 
                                {raceday.raceday_name}
                            </p>
                            
                            {/* 💡 STATUS BADGE (Top Right Corner) */}
                            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full flex-shrink-0 ${status.style}`}>
                                {status.text}
                            </span>
                        </div>
                        
                        {/* 2b. BOTTOM ROW: Track Name - Date */}
                        <p className="text-sm font-heading text-blackmain uppercase truncate mt-0"> 
                            {raceday.racetrack_name}
                            <span className="font-body font-normal ml-1"> 
                                - {formatDate(raceday.raceday_date)}
                            </span>
                        </p>
                    </div>
                </div>
            </Link>
        </li>
    );
}