// app/root.tsx

import type { LinksFunction } from "@remix-run/node"; 
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import "./tailwind.css";

// 🛑 FIX: Changed default imports to NAMED IMPORTS {} to resolve "Element type is invalid: got undefined"
import { Banner } from "~/components/Banner";
import { Footer } from "~/components/Footer";

// 🛑 FIX: Define the LinksFunction to correctly load external fonts/icons
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
  return (
    // Wrap the entire application content in the sticky layout structure
    <>
      {/* 1. HEADER */}
      <Banner />
      
      {/* 2. MAIN CONTENT (CRITICAL: Needs flex-grow to push footer down) */}
      <main className="flex-grow bg-white rounded-tl-3xl rounded-tr-3xl">
          <Outlet />
      </main>
      
      {/* 3. FOOTER */}
      {/* Note: Using a <div> instead of a <main> tag here is better for semantic HTML */}
      <div className="bg-white "> 
          <Footer />
      </div>
    </>
  );
}