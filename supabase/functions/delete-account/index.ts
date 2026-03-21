// supabase/functions/delete-account/index.ts
// Supabase Edge Function: permanently delete all user data and auth account.
// Called from ProfileDrawer with the user's JWT.
// Required env vars (auto-injected): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: CORS_HEADERS }
    );
  }

  try {
    // Extract Bearer JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate the JWT using the anon client
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userError } = await userClient.auth.getUser(jwt);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const userId = userData.user.id;

    // Admin client for privileged delete operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete user data in order (skip notifications — shared catalog, no user_id column)
    await adminClient.from("push_subscriptions").delete().eq("user_id", userId);
    await adminClient.from("preferences").delete().eq("user_id", userId);
    await adminClient.from("weekly_plan").delete().eq("user_id", userId);

    // Delete the auth user via admin API
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError.message);
      return new Response(
        JSON.stringify({ error: "Failed to delete auth user" }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
