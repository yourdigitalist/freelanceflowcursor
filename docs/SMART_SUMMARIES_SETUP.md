# Smart Summaries (Insights) – Setup

Smart Summaries use **Google Gemini** (free tier) to generate client email summaries. You need to set your API key in Supabase.

## 1. Get a Gemini API key

- Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and create an API key (free tier).
- You already have the key.

## 2. Set the key in Supabase

Set the secret for the Edge Function so it can call Gemini:

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here
```

If you use the Supabase Dashboard: **Project Settings → Edge Functions → Secrets** and add `GEMINI_API_KEY`.

## 3. Deploy the Edge Function

```bash
supabase functions deploy generate-client-summary
```

## 4. Use the feature

- In the app, open **Smart Summaries** from the sidebar.
- Choose period (Today / This week / This month), optional client and projects, and toggles.
- Click **Generate summary**, then edit if needed and **Copy** or **Send to client** (opens your email client with the summary in the body).
