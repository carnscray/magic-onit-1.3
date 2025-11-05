// app/routes/check-email.tsx

import { Link } from "@remix-run/react";

export default function CheckEmail() {
  return (
    <div className="bg-slate-100 h-screen flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4 text-slate-800">
          Check Your Email
        </h1>
        <p className="text-gray-700 mb-6">
          We've sent a confirmation link to your email address. Please click the
          link to complete your registration and sign in.
        </p>
        <Link
          to="/"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
}