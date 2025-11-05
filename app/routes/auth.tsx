// app/routes/auth.tsx

import { json } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { createSupabaseServerClient } from "~/supabase/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();

  // Use the environment variable, falling back to the local value if not present
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

  return (
    <div className="bg-orange-50 h-screen flex justify-center items-center">
      {!actionData?.success ? (
        <Form method="post" className="min-w-96 h-auto">
          <div className="w-full">
            <h2 className="text-xl font-medium">Sign in</h2>
            <hr />
            <div className="mb-5 mt-2">
              <label
                htmlFor="email"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Your email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Your email address"
                required
              />
            </div>

            <button
              type="submit"
              disabled={state === "submitting"}
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              {state === "submitting" ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </Form>
      ) : (
        <h3 className="text-lg font-medium">Please check your email.</h3>
      )}
    </div>
  );
};
export default SignIn;
