// @ts-nocheck
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import { sendAccountDeletedEmail } from "./lance-email.ts";

async function listAllFilesInFolder(
  supabase: SupabaseClient,
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

export type DeleteUserAccountInput = {
  userId: string;
  email?: string | null;
  name?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  sendConfirmationEmail?: boolean;
};

export type DeleteUserAccountResult = {
  ok: boolean;
  error?: string;
  emailSent?: boolean;
};

export async function deleteUserAccount(
  adminClient: SupabaseClient,
  input: DeleteUserAccountInput,
): Promise<DeleteUserAccountResult> {
  const { userId } = input;
  const sendConfirmationEmail = input.sendConfirmationEmail !== false;

  let recipientEmail = (input.email || "").trim();
  let recipientName = (input.name || "").trim();

  if (!recipientEmail || !recipientName) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, full_name, first_name, last_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (!recipientEmail) {
      recipientEmail = ((profile?.email as string) || "").trim();
    }
    if (!recipientName) {
      const first = ((profile?.first_name as string) || "").trim();
      const last = ((profile?.last_name as string) || "").trim();
      const combined = `${first} ${last}`.trim();
      recipientName =
        combined ||
        ((profile?.full_name as string) || "").trim() ||
        recipientEmail.split("@")[0] ||
        "there";
    }
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  const stripeCustomerId = input.stripeCustomerId?.trim() || null;
  const stripeSubscriptionId = input.stripeSubscriptionId?.trim() || null;

  if (stripeSecret && (stripeCustomerId || stripeSubscriptionId)) {
    const stripe = new Stripe(stripeSecret);
    try {
      if (stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(stripeSubscriptionId);
        } catch (err) {
          console.warn("Stripe subscription cancel failed (may already be canceled):", err);
        }
      }
      if (stripeCustomerId) {
        try {
          await stripe.customers.del(stripeCustomerId);
        } catch (err) {
          console.warn("Stripe customer delete failed:", err);
        }
      }
    } catch (err) {
      console.error("Stripe cleanup error:", err);
    }
  }

  if (sendConfirmationEmail && recipientEmail) {
    const emailResult = await sendAccountDeletedEmail(adminClient, {
      email: recipientEmail,
      name: recipientName || "there",
    });
    if (!emailResult.ok) {
      return { ok: false, error: emailResult.error || "Failed to send account deleted confirmation email" };
    }
  }

  const reviewFilePaths = await listAllFilesInFolder(adminClient, "review-files", userId);
  if (reviewFilePaths.length > 0) {
    const { error: removeError } = await adminClient.storage
      .from("review-files")
      .remove(reviewFilePaths);

    if (removeError) {
      return { ok: false, error: `Failed to delete storage files: ${removeError.message}` };
    }
  }

  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    return { ok: false, error: `Failed to delete user: ${deleteUserError.message}` };
  }

  return { ok: true, emailSent: sendConfirmationEmail && !!recipientEmail };
}
