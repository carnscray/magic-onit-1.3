// app/routes/check-email.tsx

import { Link } from "@remix-run/react";

export default function CheckEmail() {
  return (
    // 💡 MODIFIED: Changed outer container to match the padding and centering of auth routes
    <div className="w-full flex justify-center items-start pt-4 pb-16">
      
      {/* 💡 MODIFIED: Updated card styling to match auth/register pages */}
      <div className="bg-white p-8 rounded-2xl w-full max-w-md text-center">
        
        {/* 💡 MODIFIED: Heading styling */}
        <h1 className="text-3xl font-heading font-bold text-main mb-4">
          Check Your Email
        </h1>
        
        {/* 💡 MODIFIED: Body text styling */}
        <p className="text-lg text-blackmain font-body mb-8">
          We've sent a magic link to your email address. Please click the link to complete your registration and sign in.
        </p>
        
        {/* 💡 MODIFIED: Link styling */}
        <Link
          to="/"
          className="font-medium text-main hover:text-opacity-80 underline"
        >
          &larr; Back to Home
        </Link>
        
      </div>
    </div>
  );
}