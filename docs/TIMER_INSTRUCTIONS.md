# Timer – User instructions and in-app copy

This document lists the instructions and messages shown to users for the global timer (Option 1: context + bar). Use it for support, docs, or to keep copy consistent.

---

## In-app instructions (Timer page)

- **Page subtitle (Timer view):**  
  *"Track time and save entries. Your timer keeps running when you switch pages—use the bar at the bottom to pause or save."*

- **Segments card:**  
  *"Paused and resumed chunks. Save entry to log them as one time entry. You can also save from the bar at the bottom when you're on another page."*

---

## Toasts (notifications)

- **When user starts the timer:**  
  **Title:** Timer started  
  **Description:** You can navigate away—the timer keeps running. Use the bar at the bottom to pause or open the Timer page to save.

- **When user pauses the timer:**  
  **Title:** Timer paused  
  **Description:** Use the bar at the bottom to resume, or open the Timer page to save your entry.

- **When user saves time from the bar without a description:**  
  **Title:** Add a description first  
  **Description:** Open the Timer page to add what you worked on, then save your time.

- **When user saves time successfully (from bar or Timer page):**  
  **Title:** Time entry saved  
  **Description:** [X]h [Y]m [Z]s logged. (e.g. "1h 23m 0s logged.")

- **When user tries to save from Timer page without description:**  
  **Title:** Description required  
  **Description:** Enter what you worked on before saving.

- **When save fails (e.g. network error):**  
  **Title:** Error saving time  
  **Description:** [Error message from the system.]

---

## Timer bar (bottom of screen)

- Shown only when the user has started the timer (has at least one segment, saved or unsaved).
- **Labels:** Elapsed time (e.g. 00:42:15), then description/project or "No description yet".
- **Buttons:** Pause | Resume | Save | Open Timer (link to `/time/timer`).
- **Save from bar:** If there is no description, we show the toast above and do not save. User can open Timer to add a description and save there (or add description and use Save on the bar).

---

## Behaviour summary for users

1. Start the timer on the **Timer** page (Time → Timer). Add description and project if you want before or while it runs.
2. You can **navigate to any other page** (Dashboard, Clients, etc.). The timer keeps running and your draft is kept.
3. A **bar at the bottom** of the screen shows elapsed time and quick actions: **Pause**, **Resume**, **Save**, and **Open Timer**.
4. **Pause** stops the current segment; **Resume** starts a new segment. All segments are saved together when you click **Save** (after adding a description if needed).
5. To **save**, add a description (on the Timer page or before leaving), then use **Save** on the bar or on the Timer page. You need at least a description to save.
6. Your **timer draft is stored in the browser** (per device). Refreshing the page keeps the draft; closing the tab or clearing site data will lose unsaved time.

---

## For support / FAQ

- **"I left the Timer page and my time disappeared"**  
  It shouldn’t: the timer runs in the background and the bar at the bottom should show. If the bar isn’t visible, make sure you didn’t discard the timer and that you’re on a page that shows the app layout (e.g. Dashboard, Clients). If the tab was closed or site data cleared, unsaved time can be lost.

- **"Can I save from another page?"**  
  Yes. Use **Save** on the bar at the bottom. You must have added a description (on the Timer page) first; otherwise you’ll see a message asking you to open the Timer page to add what you worked on.

- **"Does the timer keep running if I close the browser?"**  
  No. The timer runs only while the app is open in that tab. When you come back, the last saved draft (if any) is restored from this device’s storage, but time is not counted while the tab was closed.
