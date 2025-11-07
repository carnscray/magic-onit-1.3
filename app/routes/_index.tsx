// app/routes/_index.tsx

import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import {
  Form,
  json,
  Link,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Welcome" },
    { name: "description", content: "Welcome to the Tipping Competition!" },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  // 💡 OPTIMIZED: Use getSession() for a faster authentication check
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  
  // If session exists, use session.user. Otherwise, user is null.
  // This is faster than getUser() as it avoids a full network roundtrip if the session is cached.
  let user = session?.user || null;

  return json({ user }, { headers });
};

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
  const { state } = useNavigation();

  return (
    // 💡 MODIFIED: Removed h-screen and changed styling to center the content
    <div className="w-full flex justify-center items-start pt-16 pb-16"> 
      
      {/* 💡 MODIFIED: Added shadow-xl for better visibility */}
      <section className="max-w-md mx-auto p-8 bg-white rounded-2xl  w-full">
        {loaderData.user ? (
          // --- LOGGED IN STATE ---
          <div>
            <h1 className="text-3xl font-heading font-bold text-main mb-2">
              Welcome
            </h1>
            <p className="text-lg text-blackmain font-body mb-6">
              You are signed in as: <br />
              <span className="font-medium break-all">{loaderData.user.email}</span>
            </p>
            <Form action="/auth-sign-out" method="POST" className="mt-2">
              <button
                type="submit"
                disabled={state === "submitting"}
                className="w-full bg-main hover:bg-alt text-white font-semibold py-3 px-5 rounded-md transition-colors disabled:opacity-50"
              >
                {state === "submitting" ? "Signing out..." : "Sign Out"}
              </button>
            </Form>
          </div>
        ) : (
          // --- 💡 MODIFIED: LOGGED OUT STATE ---
          <div>
            <h1 className="text-3xl font-heading font-bold text-main mb-2">
              Welcome
            </h1>
            <p className="text-lg text-blackmain font-body mb-6">
              Please sign in to continue.
            </p>
            <div className="flex flex-col space-y-4">
              <Link
                className="w-full text-center bg-main hover:bg-alt text-white font-semibold py-3 px-5 rounded-md transition-colors"
                to="/auth"
              >
                Sign In
              </Link>
              
              {/* Secondary Register Link */}
              <div className="text-center pt-2">
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

            </div>
          </div>
          // --- END MODIFICATION ---
        )}
      </section>

    </div>
  );
}