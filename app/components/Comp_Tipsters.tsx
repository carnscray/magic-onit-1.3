// Comp_Tipsters.tsx (Final Alignment Adjustments with H-30 Circle)

import type { CompData } from "./$comp_id"; // Adjust path to the main route file if necessary

// We only need the tipsters part of the CompData type
type CompTipstersProps = {
    tipsters: CompData['tipsters'];
};

export default function CompTipsters({ tipsters }: CompTipstersProps) {
  return (
    // Container uses my-12 for vertical spacing consistency
    <section className="my-12 rounded-2xl shadow-xl overflow-hidden"> 
        
        {/* Header Styling (UNCHANGED) */}
        <div className="flex items-center justify-between space-x-3 p-4 bg-gradient-custom text-white rounded-t-2xl">
            
            {/* Left side: Icon and Title */}
            <div className="flex items-center space-x-3">
                <span className="material-symbols-outlined text-3xl">
                    emoji_people
                </span>
                
                <h2 className="text-2xl font-heading font-semibold">
                    Tipsters 
                </h2>
            </div>
            
            {/* Right side: Tipster Count Badge */}
            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white text-main text-base font-bold  flex-shrink-0">
                {tipsters.length}
            </span>
        </div>
        
        {/* Wrap the list in a padded, white container (UNCHANGED) */}
        <div className="p-4 bg-white"> 
            <ul 
                // Grid layout: 2 columns on mobile, 4 columns on large screens
                className="grid grid-cols-2 gap-4 lg:grid-cols-4" 
            >
                {tipsters.map((tipster, index) => (
                <li 
                    key={index} 
                    className="p-4 bg-white shadow-lg rounded-lg border border-gray-100 hover:shadow-xl transition-shadow"
                >
                    {/* 💡 CHANGE 1: Reverted alignment to sm:items-start (top-aligned) */}
                    <div className="flex flex-col items-center sm:flex-row sm:items-start sm:space-x-4">
                        
                        {/* 💡 NEW CHANGE: Image Placeholder size updated to h-[7.5rem] w-[7.5rem] (h-30 w-30 equivalent) */}
                        <div className="h-[7.5rem] w-[7.5rem] bg-gray-200 rounded-full flex-shrink-0 mb-3"> 
                            {/* Placeholder for future image */}
                        </div>

                        {/* --- Tipster Name and Slogan --- */}
                        {/* 💡 pt-2 is maintained for vertical offset */}
                        <div className="flex flex-col items-center text-center sm:items-start sm:text-left pt-2">
                            <p className="text-xl font-heading font-bold text-main">
                                {tipster.tipster_nickname}
                            </p>
                            {tipster.tipster_slogan && (
                                <p className="text-sm font-body text-gray-500 italic mt-1">
                                    "{tipster.tipster_slogan}"
                                </p>
                            )}
                        </div>

                    </div>
                </li>
                ))}
            </ul>
        </div>
    </section>
  );
}