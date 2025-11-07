// app/routes/auth.tsx

import { json } from "@remix-run/node";
// 💡 MODIFICATION: Added Link
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { createSupabaseServerClient } from "~/supabase/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();

  // Use the environment variable
  const emailRedirectTo = process.env.AUTH_REDIRECT_URL;

  const { error } = await supabaseClient.auth.signInWithOtp({
    email: formData.get("email") as string,
    options: {
      emailRedirectTo: emailRedirectTo,
    },
  });
  console.log('what is error', error);
  
  if (error) {
    return json({ success: false }, { headers });
  }
  return json({ success: true }, { headers });
};

const SignIn = () => {
  const actionData = useActionData<typeof action>();
  const { state } = useNavigation();
  const isSubmitting = state === "submitting";

  return (
    // 💡 MODIFIED: Removed h-screen and changed pt-40 to pt-4/pb-16
    <div className="w-full flex justify-center items-start pt-4 pb-16">
      
      {/* 💡 MODIFIED: Card styling - Removed shadow-xl (as requested previously on other pages) 
           Reverted based on the last provided code, retaining shadow-xl.
           Applying general structural changes consistent with previous fixes.
      */}
      <section className="max-w-md mx-auto p-8 bg-white rounded-2xl w-full">
        {!actionData?.success ? (
          // --- FORM STATE ---
          <>
            <h1 className="text-3xl font-heading font-bold text-main mb-6 text-center">
              Sign In
            </h1>
            <Form method="post">
              <div className="w-full">
                <div className="mb-5 mt-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-body font-medium text-blackmain"
                  >
                    Your email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    // 💡 MODIFIED: Focus colors
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-main focus:border-main"
                    placeholder="Your email address"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  // 💡 MODIFIED: Button styling
                  className="w-full bg-main hover:bg-alt text-white font-semibold py-3 px-5 rounded-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Sending Link..." : "Send Magic Link"}
                </button>
              </div>
            </Form>
            
            {/* 💡 NEW: Added Register link */}
            <div className="mt-6 text-center">
              <p className="text-sm font-body text-blackmain">
                No account?{" "}
                <Link
                  to="/register"
                  className="font-medium text-main hover:text-opacity-80 underline"
                >
                  Register
                </Link>
              </p>
            </div>
          </>
        ) : (
          // --- SUCCESS STATE ---
          <div className="text-center">
            <h1 className="text-3xl font-heading font-bold text-main mb-4">
              Check Your Email
            </h1>
            <p className="text-lg text-blackmain font-body">
              We've sent a magic link to your email address. Click the link to sign in.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
export default SignIn;