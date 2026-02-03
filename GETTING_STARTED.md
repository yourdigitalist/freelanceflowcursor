# Getting started with FreelanceFlow (no coding needed)

This guide gets your app running on your computer in a few steps. You’ll use the **Terminal** (or **Command Prompt** on Windows) to type a few commands—no coding required.

---

## Step 1: Install Node.js (one-time)

Node.js is the program that runs your app. If you’re not sure you have it:

1. Open **Terminal** (Mac) or **Command Prompt** (Windows).
2. Type: `node -v` and press Enter.
3. If you see a version number (e.g. `v20.10.0`), you’re good—skip to **Step 2**.
4. If you see “command not found” or an error:
   - Go to [https://nodejs.org](https://nodejs.org).
   - Download the **LTS** version (recommended).
   - Run the installer and follow the steps.
   - Close and reopen Terminal/Command Prompt, then run `node -v` again to confirm.

---

## Step 2: Open your project folder in Terminal

You need to “be inside” the project folder when you run commands.

**On Mac (Terminal):**
1. Open **Terminal** (search “Terminal” in Spotlight).
2. Type: `cd ` (with a space after `cd`).
3. Drag your project folder (**repo-to-show-main**) from Finder into the Terminal window.
4. Press Enter.

You should see something like:
`your-username@MacBook repo-to-show-main %`

**On Windows (Command Prompt or PowerShell):**
1. Open **File Explorer** and go to the folder that contains **repo-to-show-main**.
2. Click the address bar at the top, type `cmd` and press Enter (a Command Prompt will open in that folder).
3. Type: `cd repo-to-show-main` and press Enter.

---

## Step 3: Install the app’s dependencies (one-time per project)

The app needs a set of libraries. You install them with one command.

1. In the same Terminal/Command Prompt window, type:
   ```bash
   npm install
   ```
2. Press Enter.
3. Wait until it finishes (can take 1–2 minutes). You’ll see a lot of text; that’s normal.
4. When you see your prompt again (e.g. `repo-to-show-main %`) with no errors, you’re done.

If you see **errors in red**, copy the last few lines and search for them online, or ask someone technical for help. Often it’s a network or Node version issue.

---

## Step 4: Make sure your environment file exists

Your app talks to Supabase (your database and auth). It needs a file named `.env` in the project folder with your Supabase settings.

- **If you already have a `.env` file** (you might have created it when you first set up the app in Lovable): you don’t need to change anything. Go to **Step 5**.
- **If you don’t have a `.env` file:**
  1. Copy the example file:  
     - Mac/Linux: `cp .env.example .env`  
     - Windows: `copy .env.example .env`
  2. Open `.env` in a text editor.
  3. In [Supabase](https://supabase.com) go to your project → **Project Settings** → **API**.
  4. Put the **Project URL** in `VITE_SUPABASE_URL` and the **anon public** key in `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`, then save.

---

## Step 5: Start the app

1. In the same Terminal/Command Prompt, type:
   ```bash
   npm run dev
   ```
2. Press Enter.
3. You should see something like:
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:8080/
   ```
4. Open your browser and go to: **http://localhost:8080**

You should see the FreelanceFlow landing page. You can click **Get Started** to sign in or sign up (using the Supabase project you set up).

---

## Stopping the app

- In the Terminal window where the app is running, press **Ctrl + C** (Mac or Windows).
- That stops the dev server. To run it again later, repeat **Step 5** (`npm run dev`).

---

## Quick reference

| What you want to do        | Command        |
|----------------------------|----------------|
| Install dependencies       | `npm install`  |
| Start the app              | `npm run dev`  |
| Stop the app               | Ctrl + C       |
| Open the app in browser    | http://localhost:8080 |

---

## If something doesn’t work

- **“command not found: npm”**  
  Node.js is not installed or not in your PATH. Install Node.js (Step 1) and restart Terminal.

- **“Cannot find module” or similar errors when running the app**  
  Run `npm install` again from the project folder (Step 3).

- **Blank page or “Failed to fetch” in the browser**  
  Check that your `.env` has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase project (Step 4).

- **Port 8080 already in use**  
  Another program is using that port. Either close that program or we can change the app to use a different port (you can ask for help with that).

Once the app is running, you can use it like you did when it was on Lovable—the same Supabase project and data.
