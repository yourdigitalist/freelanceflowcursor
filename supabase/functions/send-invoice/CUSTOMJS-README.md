# CustomJS setup for send-invoice PDFs

The Edge Function generates invoice PDFs by POSTing data to CustomJS (e.customjs.io). You must paste the template and function into your CustomJS dashboard.

## 1. In your CustomJS dashboard

- Create or open the project that has your endpoint (e.g. `https://e.customjs.io/Hy2sj4`).
- Ensure the request uses **POST** with **Content-Type: application/json** and **x-api-key** header.

## 2. HTML Template

- In CustomJS, open the **HTML Template** (or the variable that holds your Nunjucks HTML).
- Paste the **entire contents** of `customjs-html-template.html`.
- The template variable must be named **"HTML Template"** (or change `variables["HTML Template"]` in the JS function to match your variable name).

## 3. Custom JS Function

- In CustomJS, open the **Custom JS Function** editor.
- Paste the **entire contents** of `customjs-function.js`.
- This function reads the POST body as `input`, builds `items`/subtotal/tax/total, and renders the HTML template with Nunjucks, then returns `HTML2PDF(content)`.

## 4. Supabase secrets

In Supabase: Project → Edge Functions → send-invoice → Secrets, set:

- **CUSTOMJS_ENDPOINT_URL**: Your CustomJS endpoint URL (e.g. `https://e.customjs.io/Hy2sj4`).
- **CUSTOMJS_API_KEY**: Your CustomJS x-api-key.

You can remove **BROWSERLESS_API_KEY** if you no longer use it.

## 5. Response format

The Edge Function expects the CustomJS response to be JSON containing the PDF as base64, e.g. one of:

- `{ "pdf": "<base64>" }`
- `{ "pdfBase64": "<base64>" }`
- `{ "data": "<base64>" }`
- `{ "content": "<base64>" }`

If your CustomJS endpoint returns a different shape, add the correct property name in `index.ts` (search for `data.pdf ?? data.pdfBase64`).
