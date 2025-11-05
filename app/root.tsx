// app/root.tsx

import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node"; // 💡 ADDED LoaderFunctionArgs
import { json } from "@remix-run/node"; 
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import "./tailwind.css";

// IMPORT: Supabase server client
import { createSupabaseServerClient } from "./supabase/supabase.server";

// IMPORT banner and footer
import { Banner } from "~/components/Banner";
import { Footer } from "~/components/Footer";

// --- TYPE DEFINITION (UPDATED) ---
// Define the structure of the data returned by the root loader
export type RootUserData = {
  id: string;
  email: string | null;
  // 💡 NEW FIELDS: Tipster details fetched via user_profiles
  tipsterNickname: string | null;
  tipsterFullname: string | null;
} | null;


// Define the LinksFunction to correctly load external fonts/icons
export const links: LinksFunction = () => [
    // 1. MATERIAL SYMBOLS ICON LINK (Required for the power_settings_circle icon)
    { 
        rel: "stylesheet", 
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" 
    },
    
    // 2. Preconnect links (Good practice for performance)
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
];


// --- LOADER FUNCTION: FETCH CURRENT USER STATUS (UPDATED) ---
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Use the server client to check the session
  const { supabaseClient } = createSupabaseServerClient(request);
  const { data: { user } } = await supabaseClient.auth.getUser();
  
  let profileData: RootUserData = null;

  if (user) {
    // 💡 NEW QUERY: Join user_profiles to tipster to get nickname and fullname
    const { data: profile, error } = await supabaseClient
      .from("user_profiles")
      .select(`
        tipster:tipster_id (
          tipster_nickname,
          tipster_fullname
        )
      `)
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching user profile/tipster details:", error);
    }
    
    // Construct the full data object
    profileData = {
      id: user.id,
      email: user.email,
      tipsterNickname: profile?.tipster?.tipster_nickname ?? null,
      tipsterFullname: profile?.tipster?.tipster_fullname ?? null,
    };
  }

  // The loader must return a Remix json response
  return json({ user: profileData });
};


export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* IMPORTANT: <Meta /> and <Links /> must be here */}
        <Meta />
        <Links /> 
      </head>
      
      {/* 🛑 STICKY FOOTER LAYOUT: min-h-screen and flex flex-col applied to body */}
      <body className="min-h-screen flex flex-col bg-gradient-custom"> 
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// 🛑 SYNTAX FIX: Ensured the component structure is perfectly clean to avoid the extra "}" error.
export default function App() {
  // 💡 GET DATA: Access the user data returned from the loader
  const { user } = useLoaderData<typeof loader>();
  
  // The 'user' object here will be the RootUserData type
  
  return (
    <>
      {/* 1. HEADER: Pass the full user object to the Banner */}
      <Banner user={user} />
      
      {/* 2. MAIN CONTENT (CRITICAL: Needs flex-grow to push footer down) */}
      <main className="flex-grow bg-white rounded-tl-3xl rounded-tr-3xl">
          <Outlet />
      </main>
      
      {/* 3. FOOTER */}
      <div className="bg-white "> 
          <Footer />
      </div>
    </>
  );
}