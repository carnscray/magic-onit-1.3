// app/routes/auth-sign-out.tsx

import { redirect } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";

import { createSupabaseServerClient } from "~/supabase/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);

  // if the user is not signed in, redirect to the home page
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session?.user) {
    return redirect("/");
  }
  // sign out
  await supabaseClient.auth.signOut();
  return redirect("/", {
    headers,
  });
};
