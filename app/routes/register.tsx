// app/routes/register.tsx

import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";

export const meta: MetaFunction = () => {
  return [{ title: "Register Account" }];
};

// Loader: If user is already logged in, redirect them to the home page
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    return redirect("/", { headers });
  }

  return json(null, { headers });
};

// Action: Handle the form submission
export const action = async ({ request }: ActionFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();

  const email = String(formData.get("email"));
  const fullname = String(formData.get("fullname"));
  const nickname = String(formData.get("nickname"));
  
  // NOTE: AUTH_REDIRECT_URL must be set in your .env file
  const emailRedirectTo = process.env.AUTH_REDIRECT_URL;


  if (!email || !fullname || !nickname) {
    return json(
      { error: "All fields are required." },
      { status: 400, headers }
    );
  }

  // --- CHANGED: Use signInWithOtp for passwordless registration (Magic Link) ---
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: emailRedirectTo,
      // The 'data' object is still passed to raw_user_meta_data
      // This is crucial for the database trigger to populate tipster/user_profiles
      data: {
        fullname: fullname,
        nickname: nickname,
      },
    },
  });
  // ---------------------------------------------------------------------------

  if (error) {
    return json(
      { error: `Registration failed: ${error.message}` },
      { status: 500, headers }
    );
  }

  // Redirect to a page telling the user to check their email
  return redirect("/check-email", { headers });
};

// Component: The registration form
export default function Register() {
  const actionData = useActionData<typeof action>();
  const { state } = useNavigation();
  const isSubmitting = state === "submitting";

  return (
    <div className="bg-slate-100 h-screen flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-slate-800">
          Create Account
        </h1>

        <Form method="post">
          <div className="mb-4">
            <label
              htmlFor="fullname"
              className="block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>
            <input
              type="text"
              name="fullname"
              id="fullname"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-gray-700"
            >
              Nickname (display name)
            </label>
            <input
              type="text"
              name="nickname"
              id="nickname"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>
            <input
              type="email"
              name="email"
              id="email"
              required
              autoComplete="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* --- REMOVED PASSWORD FIELD --- */}
          {/* <div className="mb-6">...</div> */}
          {/* ----------------------------- */}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? "Sending Link..." : "Register & Get Magic Link"}
          </button>

          {actionData?.error && (
            <p className="mt-4 text-sm text-red-600 text-center">
              {actionData.error}
            </p>
          )}
        </Form>
      </div>
    </div>
  );
}