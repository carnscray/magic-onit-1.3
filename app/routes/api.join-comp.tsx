// app/routes/api.join-comp.tsx

import { json, type ActionFunctionArgs } from "@remix-run/node";
import { createSupabaseServerClient } from "~/supabase/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();

  // --- MODIFICATION: Trim whitespace from inputs ---
  const compId = String(formData.get("comp_id") || "").trim();
  const inviteCode = String(formData.get("invite_code") || "").trim();
  // --- END MODIFICATION ---

  if (!compId || !inviteCode) {
    return json({ error: "CompID and code are required." }, { status: 400, headers });
  }

  // 1. 💡 OPTIMIZATION: Auth Check (Fast getSession)
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !session) {
    return json({ error: "You must be logged in." }, { status: 401, headers });
  }
  const authUserId = session.user.id;

  // Fetch ONLY the tipster_id
  const { data: profile, error: profileError } = await supabaseClient
    .from("user_profiles")
    .select("tipster_id")
    .eq("id", authUserId)
    .single();

  if (profileError || !profile) {
    return json({ error: "Could not find your user profile." }, { status: 500, headers });
  }
  const tipsterId = profile.tipster_id;


  // 2. Find the competition and validate the invite code
  const { data: comp, error: compError } = await supabaseClient
    .from("comp")
    .select("id, comp_invitecode")
    .eq("id", Number(compId)) // This correctly queries the bigint column
    .single();

  if (compError || !comp) {
    // This error means the .eq("id", Number(compId)) found 0 rows.
    return json({ error: "Comp not found." }, { status: 404, headers });
  }

  // --- MODIFICATION: Use .toUpperCase() for case-insensitive check ---
  // We also check if comp_invitecode is null
  const dbCode = (comp.comp_invitecode || "").toUpperCase();
  const userCode = inviteCode.toUpperCase();

  if (dbCode !== userCode || dbCode === "") {
    return json({ error: "Invalid Invite Code." }, { status: 400, headers });
  }
  // --- END MODIFICATION ---


  // 4. Add the tipster to the competition
  const { error: insertError } = await supabaseClient
    .from("comp_tipster")
    .insert({
      comp: comp.id,
      tipster: tipsterId,
    });

  if (insertError) {
    if (insertError.code === '23505') {
       return json({ error: "You are already in this comp." }, { status: 400, headers });
    }
    return json({ error: `Failed to join comp: ${insertError.message}` }, { status: 500, headers });
  }

  // 5. Success
  return json({ success: true }, { headers });
};