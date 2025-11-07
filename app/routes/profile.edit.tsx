// app/routes/profile.edit.tsx

import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/supabase.server";
// [REMOVED] TipsterHeader import removed

export const meta: MetaFunction = () => {
  return [{ title: "Edit Profile" }];
};

// --- TYPE DEFINITION for loader data (UNCHANGED) ---
type ProfileData = {
  tipster: {
    id: number;
    tipster_fullname: string;
    tipster_nickname: string;
    tipster_slogan: string | null;
  };
};

// --- LOADER: Fetch current profile data (REVERTED FOR SECURITY) ---
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);

  // 1. 💡 REVERTED: Get user using the secure, heavy getUser() call
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    return redirect("/auth", { headers });
  }

  // 2. 💡 MODIFIED: Get all required profile data using the authenticated user.id
  const { data: profileData, error: profileError } = await supabaseClient
    .from("user_profiles")
    .select("tipster:tipster_id(id, tipster_fullname, tipster_nickname, tipster_slogan)")
    .eq("id", user.id) // Use authenticated user ID
    .single();

  if (profileError || !profileData || !profileData.tipster) {
    console.error("Error fetching profile for edit:", profileError);
    return redirect("/comps", { headers });
  }

  // No specific Cache-Control is needed here.
  return json({ tipster: profileData.tipster }, { headers });
};

// --- ACTION: Update profile data (REVERTED FOR SECURITY) ---
export const action = async ({ request }: ActionFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();

  const fullname = String(formData.get("fullname"));
  const nickname = String(formData.get("nickname"));
  const slogan = String(formData.get("slogan"));

  if (!fullname || !nickname) {
    return json(
      { success: false, error: "Full Name and Nickname are required." },
      { status: 400, headers }
    );
  }

  // 1. 💡 REVERTED: Get user using the secure, heavy getUser() call
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    return json({ success: false, error: "Not authorized." }, { status: 401, headers });
  }

  const { data: profile } = await supabaseClient
    .from("user_profiles")
    .select("tipster_id")
    .eq("id", user.id) // Use authenticated user ID
    .single();

  if (!profile) {
    return json({ success: false, error: "Profile not found." }, { status: 404, headers });
  }
  const tipster_id = profile.tipster_id;

  // 2. Update the tipster table
  const { error: updateError } = await supabaseClient
    .from("tipster")
    .update({
      tipster_fullname: fullname,
      tipster_nickname: nickname,
      tipster_slogan: slogan || null, // Ensure empty string becomes null
    })
    .eq("id", tipster_id);

  if (updateError) {
    return json(
      { success: false, error: `Update failed: ${updateError.message}` },
      { status: 500, headers }
    );
  }

  // 3. Success. Redirect back to the comps page.
  return redirect("/comps", { headers });
};

// --- COMPONENT: Profile Edit Form (UNCHANGED) ---
export default function EditProfile() {
  const { tipster } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { state } = useNavigation();
  const isSubmitting = state === "submitting";

  return (
    <div className="p-2 max-w-xl mx-auto lg:max-w-7xl">
      {/* [REMOVED] TipsterHeader component removed */}

      <section className="my-12 rounded-2xl shadow-xl overflow-hidden">
        {/* Header Styling */}
        <div className="flex items-center justify-between space-x-3 p-4 bg-gradient-custom text-white rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <span className="material-symbols-outlined text-3xl">
              account_circle
            </span>
            <h2 className="text-2xl font-heading font-semibold">
              Edit Profile
            </h2>
          </div>
        </div>

        {/* Form Container */}
        <div className="p-6 bg-white">
          <Form method="post">
            <div className="space-y-6">
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
                  defaultValue={tipster.tipster_fullname}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="nickname"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nickname (Display Name)
                </label>
                <input
                  type="text"
                  name="nickname"
                  id="nickname"
                  required
                  defaultValue={tipster.tipster_nickname}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="slogan"
                  className="block text-sm font-medium text-gray-700"
                >
                  Slogan (Optional)
                </label>
                <input
                  type="text"
                  name="slogan"
                  id="slogan"
                  defaultValue={tipster.tipster_slogan || ""}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm active:outline-none active:ring-main active:border-main"
                />
              </div>

              {actionData?.error && (
                <p className="mt-4 text-sm text-red-600 text-center">
                  {actionData.error}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-alt text-white py-2 px-6 rounded-md active:bg-altlight active:scale-[0.9] transform"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </Form>
        </div>
      </section>
    </div>
  );
}