import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAccountDeletedEmail } from "../_shared/lance-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function listAllFilesInFolder(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  folder: string,
): Promise<string[]> {
  const paths: string[] = [];

  const walk = async (prefix: string) => {
    let offset = 0;
    const limit = 100;

    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, {
        limit,
        offset,
      });

      if (error) {
        throw new Error(`Failed to list storage files: ${error.message}`);
      }

      if (!data || data.length === 0) break;

      for (const item of data) {
        const nextPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id) {
          paths.push(nextPath);
        } else {
          await walk(nextPath);
        }
      }

      if (data.length < limit) break;
      offset += limit;
    }
  };

  await walk(folder);
  return paths;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase environment variables" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    const userId = authData.user?.id;
    const authEmail = authData.user?.email?.trim() || "";

    if (authError || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, full_name, first_name, last_name")
      .eq("user_id", userId)
      .maybeSingle();

    const profileEmail = (profile?.email as string | null)?.trim() || "";
    const recipientEmail = profileEmail || authEmail;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "No email on file for this account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const first = (profile?.first_name as string | null)?.trim() || "";
    const last = (profile?.last_name as string | null)?.trim() || "";
    const combined = `${first} ${last}`.trim();
    const recipientName =
      combined ||
      (profile?.full_name as string | null)?.trim() ||
      recipientEmail.split("@")[0] ||
      "there";

    // Send confirmation before deleting auth user (profile row cascades or is removed with user).
    const emailResult = await sendAccountDeletedEmail(adminClient, {
      email: recipientEmail,
      name: recipientName,
    });
    if (!emailResult.ok) {
      return new Response(
        JSON.stringify({
          error: emailResult.error || "Failed to send account deleted confirmation email",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const reviewFilePaths = await listAllFilesInFolder(adminClient, "review-files", userId);
    if (reviewFilePaths.length > 0) {
      const { error: removeError } = await adminClient.storage
        .from("review-files")
        .remove(reviewFilePaths);

      if (removeError) {
        return new Response(
          JSON.stringify({ error: `Failed to delete storage files: ${removeError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${deleteUserError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true, emailSent: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
