// Comp_RacedayPast.tsx (Updated with Banner Header)

export default function CompRacedayPast() {
    return (
        // 💡 CHANGE 1: Added vertical margin (my-12) and structural classes
        <section className="my-12 rounded-2xl shadow-xl overflow-hidden">
            
            {/* ========================================================== */}
            {/* 🏁 RACEDAYS PAST SECTION HEADER (BANNER STYLE) 🏁 */}
            {/* ========================================================== */}
            
            {/* 💡 CHANGE 2: Applied the gradient header style */}
            <div className="flex items-center justify-between space-x-3 p-4 bg-gradient-custom text-white rounded-t-2xl">
                
                {/* Left side: Icon (History) and Title */}
                <div className="flex items-center space-x-3">
                    <span className="material-symbols-outlined text-3xl">
                        history
                    </span>
                    
                    <h2 className="text-2xl font-heading font-semibold">
                        Past Racedays
                    </h2>
                </div>
                
                {/* Right side: This area is left intentionally empty 
                    as this placeholder component does not have a dynamic count yet. */}
                <div />
            </div>
            
            {/* 💡 CHANGE 3: Wrap placeholder text in a padded white container (p-6) */}
            <div className="p-6 bg-white"> 
                <p className="text-gray-500 italic font-body">
                    Placeholder: Historical raceday data and final standings will appear here.
                </p>
            </div>
        </section>
    );
}