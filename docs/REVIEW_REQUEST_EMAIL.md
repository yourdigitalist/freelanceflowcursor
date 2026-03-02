# Review request (approval) email template

When you click **“Send to client”** or **“Mark as sent”** for an approval request, the app calls the **`send-review-request`** Edge Function, which sends the email via **Resend** using a built-in HTML template.

## Where to change the email

The template is **not** in the Supabase Dashboard. It lives in code:

**File:** `supabase/functions/send-review-request/index.ts`

### What you can edit

1. **Subject line** (around line 188)  
   - Default: `Review request from ${fromDisplayName}: ${request.title} (v${request.version})`  
   - Edit the string passed to `subject:` in `resend.emails.send()`.

2. **Body content** (variable `coreHtml`, around lines 151–159)  
   - The main message (title, version, due date, “Open review” button, plain link).  
   - Edit the `coreHtml` template string to change copy, layout, or add/remove the due date.

3. **Header and footer**  
   - If the user’s profile has `client_email_header_html` and `client_email_footer_html` (from branding/settings), those are used.  
   - Otherwise the function uses `getDefaultClientHeader()` and `getDefaultClientFooter()` in the same file (logo, business name, primary color, “Sent by Lance”).

### Sending and branding

- **From address:** Resend (e.g. `onboarding@resend.dev`) – configure your domain in Resend if you want a custom “from”.
- **Reply-to:** Set from profile `business_email` or `email` when present.
- **Branding:** Primary color, logo, and optional custom header/footer come from the user’s **profile** (e.g. Settings → Branding). The Edge Function reads `profiles.client_email_primary_color`, `profiles.business_logo`, `profiles.client_email_header_html`, `profiles.client_email_footer_html`.

### How to review the email after a test send

1. Send a test approval to yourself (Approvals → open a request → “Send to client” with your email as recipient).  
2. Check your inbox for the Resend email.  
3. To change how it looks or what it says, edit `supabase/functions/send-review-request/index.ts` as above and redeploy the function:

   ```bash
   supabase functions deploy send-review-request
   ```

There is no separate “email template” file in the repo; the HTML is built in the function. For a quick visual check, you can add a temporary log of `emailHtml` (or use Resend’s dashboard logs) to inspect the exact HTML sent.
