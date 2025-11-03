// app/components/Banner.tsx (UPDATED: Removed all nickname logic and imports)

import { Link, Form, useNavigation } from "@remix-run/react";

export default function Banner() {
  
  // navItemClasses are now used only for the Comps icon link
  const navItemClasses = "text-white hover:text-indigo-200 transition duration-150 p-2";

  return (
    <header className="bg-gradient-custom shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        
        {/* Navigation Links (Left Side) */}
        <nav className="flex items-center space-x-4">
          
          {/* Competitions Icon */}
          <Link 
            to="/comps" 
            className={navItemClasses}
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

        {/* Profile Link (Account Circle Icon) */}
        <Link 
          to="/profile/edit" 
          className="text-white hover:text-indigo-200 transition duration-150 p-2"
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