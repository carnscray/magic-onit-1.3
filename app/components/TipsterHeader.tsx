// app/components/TipsterHeader.tsx

interface TipsterHeaderProps {
    // The nickname is typed as string because tipsterDetails.tipster_nickname 
    // in the loader is typed as string | null, but we assume it's non-null 
    // before rendering, or you should handle the null case here.
    nickname: string | null; // Changed to allow null just in case, though the loader usually guarantees a nickname.
}

export function TipsterHeader({ nickname }: TipsterHeaderProps) {
    // Defensive check: If nickname is null/undefined, don't render.
    if (!nickname) {
        return null; 
    }

    return (
        // The display logic remains exactly as you defined it
        
        //HIDDEN - the entire thing for now - might add back later

        <div className="hidden text-right flex justify-end items-center pr-4 pt-2">
            {/* Emoji People Icon */}
            <span 
                className="material-symbols-outlined mr-1 text-xl text-main" 
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 30" }}
            >
                emoji_people
            </span>
            
            {/* Nickname Text */}
            <p className="text-sm text-main ">
                {nickname}
            </p>
        </div>
    );
}