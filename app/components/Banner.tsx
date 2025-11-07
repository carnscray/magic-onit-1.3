// app/components/Banner.tsx (Final Update: Conditional Display - Minimal Change)

import { Link } from "@remix-run/react"; 
import type { RootUserData } from "~/root"; 

interface BannerProps {
    user: RootUserData; 
}

export function Banner({ user }: BannerProps) {
  
  const isLoggedIn = !!user; // True if user is logged in
  const iconLinkClasses = "text-white hover:text-indigo-200 transition duration-150 p-2";

  return (
    <header className="bg-gradient-custom shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        
        {/* 1. Brand/Home Link (Left Side) */}
        <nav className="flex items-center space-x-4">
          {/* Competitions Icon - Always Visible */}
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

        {/* 2. User Profile/Navigation (Right Side) */}
        <div className="flex items-center space-x-2"> 
            
            {/* 💡 My Comps Link (CONDITIONAL) */}
            {isLoggedIn && (
                <Link 
                    to="/comps" 
                    className="text-sm font-semibold text-white mr-0 hover:text-mainlight transition duration-150 whitespace-nowrap"
                >
                    My Comps
                </Link>
            )}
            
            {/* Nickname and Separator (CONDITIONAL) */}
            {user?.tipsterNickname && isLoggedIn && (
                <>
                    {/* Separator */}
                    <span className="text-white text-opacity-70">|</span> 

                    {/* Nickname Link */}
                    <Link 
                        to="/profile/edit" 
                        className="text-sm font-semibold text-white mr-0 hover:text-mainlight transition duration-150 whitespace-nowrap"
                        aria-label="Edit Profile"
                    >
                        {user.tipsterNickname}
                    </Link>
                </>
            )}

            {/* 💡 Account Icon link (CONDITIONAL) */}
            {isLoggedIn && (
                <Link 
                  to="/profile/edit" 
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
            )}
            
        </div>
        
      </div>
    </header>
  );
}