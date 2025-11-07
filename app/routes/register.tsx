// app/routes/register.tsx

import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
// 💡 MODIFICATION: Added Link
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
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

// Action: Handle the form submission (Unchanged)
export const action = async ({ request }: ActionFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();

  const email = String(formData.get("email"));
  const fullname = String(formData.get("fullname"));
  const nickname = String(formData.get("nickname"));
  
  const emailRedirectTo = process.env.AUTH_REDIRECT_URL;


  if (!email || !fullname || !nickname) {
    return json(
      { error: "All fields are required." },
      { status: 400, headers }
    );
  }

  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: emailRedirectTo,
      data: {
        fullname: fullname,
        nickname: nickname,
      },
    },
  });

  if (error) {
    return json(
      { error: `Registration failed: ${error.message}` },
      { status: 500, headers }
    );
  }

  return redirect("/check-email", { headers });
};

// --- 💡 COMPONENT (Updated) ---
export default function Register() {
  const actionData = useActionData<typeof action>();
  const { state } = useNavigation();
  const isSubmitting = state === "submitting";

  return (
    // 💡 MODIFIED: Removed h-screen and changed pt-40 to pt-16/pb-16 for better centering
    <div className="w-full flex justify-center items-start pt-4 pb-16">
      {/* 💡 MODIFIED: Card styling */}
      <div className="bg-white p-8 rounded-2xl  w-full max-w-md">
        {/* 💡 MODIFIED: Font and color */}
        <h1 className="text-3xl font-heading font-bold text-main mb-6 text-center">
          Create Account
        </h1>

        <Form method="post">
          <div className="mb-4">
            <label
              htmlFor="fullname"
              className="block text-sm font-body font-medium text-blackmain"
            >
              Full Name
            </label>
            <input
              type="text"
              name="fullname"
              id="fullname"
              required
              // 💡 MODIFIED: Focus colors
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-main focus:border-main"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="nickname"
              className="block text-sm font-body font-medium text-blackmain"
            >
              Nickname (display name)
            </label>
            <input
              type="text"
              name="nickname"
              id="nickname"
              required
              // 💡 MODIFIED: Focus colors
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-main focus:border-main"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="email"
              className="block text-sm font-body font-medium text-blackmain"
            >
              Email Address
            </label>
            <input
              type="email"
              name="email"
              id="email"
              required
              autoComplete="email"
              // 💡 MODIFIED: Focus colors
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-main focus:border-main"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            // 💡 MODIFIED: Button styling
            className="w-full bg-main hover:bg-alt text-white font-semibold py-3 px-5 rounded-md transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Sending..." : "Register & Get Magic Link"}
          </button>

          {actionData?.error && (
            // 💡 MODIFIED: Text color
            <p className="mt-4 text-sm text-alert text-center">
              {actionData.error}
            </p>
          )}
        </Form>
        
        {/* 💡 NEW: Added Sign In link */}
        <div className="mt-6 text-center">
          <p className="text-sm font-body text-blackmain">
            Already have an account?{" "}
            <Link
              to="/auth"
              className="font-medium underline text-main hover:text-opacity-80"
            >
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}