// app/components/Comp_RacedayCard.tsx

import { Link } from "@remix-run/react"; 
import type { RacedayData } from "../routes/comps.$comp_id._layout"; // Corrected path assumption
// NOTE: Assuming the correct path to RacedayData type is available via the parent layout file
// If the path needs adjustment: import type { RacedayData } from "~/routes/comps.$comp_id.$comp_raceday_id"; 


// Prop definition - Reuses the RacedayData type
type CompRacedayCardProps = {
    raceday: RacedayData;
};

// --- DATE HELPER FUNCTIONS (UNCHANGED) ---

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
        return { text: "YESTERDAY", style: "bg-mainlight text-white" };
    } else {
        return { text: "UPCOMING", style: "bg-alt text-white" };
    }
};


export default function CompRacedayCard({ raceday }: CompRacedayCardProps) {
    
    const status = getRacedayStatus(raceday.raceday_date);
    
    return (
        <li 
            key={raceday.comp_raceday_id} 
            // 🛑 MODIFIED: List item is now just a relative wrapper
            className="relative"
        >
            {/* 🛑 MODIFIED: Link wraps the entire content and holds the card styling */}
            <Link 
                to={`${raceday.comp_raceday_id}`}
                // 💡 ADDED: Styling moved from <li>. Added interaction feedback.
                className="p-4 bg-white shadow-lg rounded-lg border border-gray-100 transition-all duration-200 block w-full h-full 
                           hover:shadow-xl hover:bg-mainlight active:bg-second active:scale-[0.9] focus:bg-second transform"
            >
                
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
                        
                        {/* ------------------- MODIFICATION START ------------------- */}

                        {/* 2a. TOP ROW: Raceday Name (Left) */}
                        <p className="text-lg font-heading font-bold text-main whitespace-normal break-words"> 
                            {raceday.raceday_name}
                        </p>
                        
                        {/* 2b. MIDDLE ROW: Track Name - Date */}
                        <p className="text-sm font-heading text-blackmain uppercase truncate mt-1"> 
                            {raceday.racetrack_name}
                            <span className="font-body font-normal ml-1"> 
                                - {formatDate(raceday.raceday_date)}
                            </span>
                        </p>

                        {/* 2c. 💡 NEW BOTTOM ROW: Status Badge (Right-aligned) */}
                        <div className="flex justify-end w-full mt-2">
                            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full flex-shrink-0 ${status.style}`}>
                                {status.text}
                            </span>
                        </div>
                        {/* -------------------- MODIFICATION END -------------------- */}
                    </div>
                </div>
            </Link>
        </li>
    );
}