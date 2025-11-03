// app/components/Banner.tsx (Trimmed for Display/Navigation Only)

import { Link } from "@remix-run/react"; 
// Note: Removed 'Form' and 'useNavigation' as they are no longer needed.

// Using a NAMED EXPORT to match the import in root.tsx
export function Banner() {
  
  // Simplified classes for the icon links
  const iconLinkClasses = "text-white hover:text-indigo-200 transition duration-150 p-2";

  return (
    <header className="bg-gradient-custom shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        
        {/* 1. Brand/Home Link (Using the Chess Knight for now) */}
        <nav className="flex items-center space-x-4">

          {/* Competitions Icon (Kept for primary navigation visibility) */}
          <Link 
            to="/comps" 
            className={iconLinkClasses}
            aria-label="Competitions"
          >
            <span 
              className="material-symbols-outlined text-3xl"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 30" }}
            >
              chess_knight
            </span>
          </Link>
        </nav>

        {/* 2. User Profile Link (Right Side) */}
        <Link 
          to="/profile/edit" // Placeholder URL
          className={iconLinkClasses}
          aria-label="Edit Profile"
        >
          <span 
            className="material-symbols-outlined text-3xl"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 30" }}
          >
            account_circle
          </span>
        </Link>
        
      </div>
    </header>
  );
}