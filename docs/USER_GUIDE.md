# Lance - Complete User Guide
**Last Updated:** May 26, 2026

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Main Navigation](#main-navigation)
3. [Dashboard](#dashboard)
4. [Clients](#clients)
5. [Projects](#projects)
6. [Time Tracking](#time-tracking)
7. [Invoices](#invoices)
8. [Services](#services)
9. [Proposals](#proposals)
10. [Contracts](#contracts)
11. [Approvals](#approvals)
12. [Notes](#notes)
13. [Notifications](#notifications)
14. [Search](#search)
15. [Feature Requests](#feature-requests)
16. [Settings](#settings)
17. [Admin Features](#admin-features)
18. [Client Portal](#client-portal)
19. [Common Workflows](#common-workflows)
20. [Limits & Constraints](#limits--constraints)

---

## Getting Started

### Sign Up & Create Your Account

**Visit the Sign Up Page** (`/auth?tab=signup`)

**Required Information:**
- **First Name**
- **Last Name**
- **Email Address**
- **Password** (minimum 6 characters)
- **Terms Acceptance** - You must check the box to accept the Privacy Policy and Terms & Conditions

**After Signing Up:**
1. Click **Create Account**
2. Check your email for a confirmation link
3. Click the confirmation link in the email
4. You'll be redirected to complete onboarding

**Alternative Sign-In Methods:**
- **Magic Link**: Enter your email and receive a login link (no password needed)
- **Forgot Password**: Request a password reset link via email

---

### Onboarding Process (4 Steps)

After confirming your email, you'll complete a guided onboarding process:

#### Step 1: What Do You Do?

Choose your professional role:
- Freelancer
- Consultant
- Designer
- Developer or Engineer
- Agency
- Coach or Trainer
- Photographer or Videographer
- Other

**Click Continue** when you've made your selection.

#### Step 2: What Will You Use Lance For First?

Select your primary need:
- Dashboard
- Clients
- Projects
- Time Tracking
- Notes
- Invoices
- Client Approvals
- Notifications

**Click Continue** to proceed.

#### Step 3: Business Setup (Optional)

Enter your business information:
- **Business Name** (required to continue)
- **Default Currency** - Searchable dropdown with currency options (defaults to USD)

**Click Continue** to move to the final step.

#### Step 4: Choose Your Plan

Select a subscription plan:

**Monthly Plan**: $29/month
- 15-day free trial
- No charge today
- Full feature access

**Annual Plan**: $290/year (Recommended)
- 15-day free trial
- Save 2 months compared to monthly
- Full feature access

**All Plans Include:**
- Unlimited clients & projects
- Time tracking
- Invoicing & PDFs
- Client approvals
- Notes & notifications
- Full dashboard analytics

**Click Continue to Payment** - You'll be taken to Stripe's secure checkout page.

**After Payment:**
- Your trial begins immediately
- You won't be charged for 15 days
- You'll be automatically redirected to your Dashboard
- You can cancel anytime before the trial ends

**Sign Out Option:** Available during onboarding if you need to stop the process.

---

### Trial & Subscription

**Free Trial:**
- **Duration**: 15 days from checkout
- **Access**: Full feature access during trial
- **Billing**: Automatic charge after trial ends unless you cancel
- **Cancel**: Visit Settings > Subscription to manage

**After Trial Expires:**
- Without an active subscription, you'll be redirected to the Subscription settings page
- You can only access the subscription management page
- Activate your subscription to regain full access

---

## Main Navigation

After logging in, you'll see the main sidebar navigation:

### Primary Navigation Items

| Menu Item | Description | Badge |
|-----------|-------------|-------|
| **Dashboard** | Your command center and overview | - |
| **Clients** | CRM and client management | Expandable |
| - All Clients | View all clients in list/grid | - |
| - Active Clients | Filtered view of active pipeline | - |
| - CRM Board | Kanban board by sales stage | - |
| **Projects** | Project management and tasks | - |
| **Time** | Time tracking features | Expandable |
| - Timesheet | Weekly/monthly calendar view | - |
| - Timer | Start/stop timer | - |
| - All Logs | Complete time entry history | - |
| **Invoices** | Invoice management | - |
| **Proposals** | Proposal builder and tracking | Beta |
| **Contracts** | Contract management | Beta |
| **Services** | Service catalog | - |
| **Approvals** | Client approval requests | Beta |
| **Notifications** | Notification feed | Unread count |

### Additional Features (Not in Sidebar)

- **Notes** - Access via Dashboard quick actions or search
- **Search** - Global search bar in header
- **Settings** - User menu in top right
- **Feature Requests** - User menu
- **Help Center** - External Crisp help docs
- **Admin** - Only visible to administrators

### Other UI Elements

**Trial Banner:**
- Displays during your active trial period
- Shows days remaining
- Link to upgrade to paid plan
- Can be dismissed temporarily

**Timer Bar:**
- Fixed bar at bottom of screen when timer is running
- Shows current timer duration
- Quick access to stop/pause timer

**Start Guide:**
- Floating setup checklist
- Helps you get started with key features
- Can be dismissed

**Feedback Tab:**
- Floating feedback widget
- Submit feedback about the app

---

## Dashboard

Your central hub for monitoring your business.

### Overview Stats

At the top of your dashboard, you'll see key metrics:

**Client & Project Stats:**
- **Total Clients** - Count of all non-archived clients
- **Active Projects** - Projects with "Active" status
- **Pending Invoices** - Number of sent invoices awaiting payment
- **Pending Amount** - Total dollar amount of pending invoices
- **Pending Proposals** - Sent or viewed proposals awaiting response
- **Pending Contracts** - Contracts awaiting signatures

**Time Stats:**
- **Hours This Month** - Total hours logged this month
- **Unbilled Hours** - Time entries marked as billable but not yet invoiced

### Dashboard Sections

#### Welcome & Quick Actions

- **Personalized Greeting** - Uses your name and time of day
- **Global Search Bar** - Search across all your data
- **Quick Action Buttons**:
  - New Client
  - New Project
  - New Invoice
  - Log Time
  - New Note

#### Recent Projects

Shows up to 4 most recent active projects with:
- Project emoji/color icon
- Project name
- Associated client
- Status badge
- Due date (if set)
- Total hours logged
- Number of tasks

**Click any project** to view full project details.
**View All** button takes you to the full projects list.

#### Recent Activity

Shows your last 5 time entries:
- Duration logged
- Project name
- When it was logged

#### Recent Invoices

- Total invoice count
- Status badges (Sent, Paid, Overdue)
- Links to latest 2 invoices
- Quick status overview

#### Client Follow-Ups

Shows clients with upcoming follow-up tasks:
- Client name
- Follow-up title
- Due date
- Click to open client details

**View All** to see complete follow-up list.

#### Approvals Overview

- Total approval requests
- Count of pending approvals
- Count of approved requests
- Link to full approvals page

#### Quick Link to Notes

Access your notes workspace from the dashboard.

---

## Clients

Complete CRM (Customer Relationship Management) system for managing your client relationships.

### Client Views

You can view your clients in three different ways:

#### 1. CRM Board (`/clients`)

**Kanban-style pipeline management:**
- Visual columns for each CRM stage
- **Drag and drop** cards between columns to update status
- **Add button** on each column to create client with that status
- Card actions: Edit, Delete (with confirmation)

**CRM Stages:**
1. New Lead
2. Contacted
3. Qualified
4. Proposal Sent
5. Negotiation
6. Won
7. Onboarding
8. Active
9. Paused
10. Inactive
11. Closed Lost

#### 2. All Clients List (`/clients/list`)

- Grid or list view toggle
- Shows all clients (not filtered)
- Search by name or company
- Click any card to open detail sheet

#### 3. Active Clients (`/clients/active`)

- List view only
- Filtered to show only "Active" status clients
- Useful for focusing on current work

### Adding a Client

Click **Add Client** to open the creation dialog.

#### Required Fields

- **First Name**
- **Last Name**
- **Email Address**

#### Optional Fields

**Contact Information:**
- Company Name
- Phone Number
- Tax Identification Number

**Address:**
- Street Address
- Street Address 2
- City
- State/Province
- ZIP/Postal Code
- Country

**CRM Information:**
- **Status** - Select from CRM stages
- **Lead Source** - Where you found this client
- **Next Follow-Up Date** - When to follow up
- **Next Action** - What you need to do next
- **Estimated Value** - Potential project value
- **Currency** - Defaults to USD

**Customization:**
- **Avatar Color** - Choose from preset color swatches
- **Logo** - Upload client's logo (NEW)
- **Tags** - Comma-separated tags for organization
- **Notes** - Internal notes about the client

#### Actions

- **Add Client** / **Update Client** - Save your changes
- **Cancel** - Close without saving

### Client Detail Sheet

Click any client card to open a detailed view:

#### Information Displayed

- Avatar with chosen color
- Client name and company
- Status badge
- Email, phone, and full address
- Next follow-up date
- Lead source
- Next action with **Mark Done** button
- Tags
- Number of related projects
- Logo (if uploaded)

#### Activity Timeline

Track all interactions with this client:

**Activity Types:**
- Note
- Email
- Call
- Meeting
- Other

**For Each Activity:**
- Type and title
- Date/time occurred
- Activity details
- Delete option

**Add Activity:**
1. Select activity type
2. Enter details in text area
3. Click **Add**

Activities are sorted by date (most recent first).

#### Follow-Ups (NEW)

Multiple follow-up tasks per client:

**Each Follow-Up Shows:**
- Title
- Details
- Due date
- Reminder date
- Status (pending/completed)

**Actions:**
- Add new follow-up
- Mark complete
- Edit follow-up
- Delete follow-up

This replaces the old single "next follow-up" field and allows you to track multiple upcoming tasks per client.

#### Client Portal Settings (NEW)

Enable a secure portal for clients to access their information:

**Portal Configuration:**
- **Enable Portal** toggle
- **Choose Visible Sections**:
  - Details
  - Invoices
  - Proposals
  - Contracts
  - Approvals
  - Time (optional: show billable, non-billable, or both)

**Portal Actions:**
- **Send Portal Link** - Email the access link to client
- **Copy Portal URL** - Get the link to share manually

The portal gives clients access without requiring them to create an account.

#### Other Actions

- **Edit** - Modify client information
- **Create Proposal** - Start a new proposal for this client
- **Create Contract** - Start a new contract for this client
- **AI Summary** - Generate an AI-powered summary of client relationship
- **Archive Client** - Soft archive (hides from active views)
- **Delete Client** - Permanently remove (only if no related records)

### Client Management Features

#### CSV Operations

**Export:**
- Download all clients as CSV
- Includes all fields

**Import:**
- Download CSV template
- Fill in client data
- Upload to bulk create/update
- **Important**: Email is required per row
- Matching email will **update** existing client

**Template Includes:**
- All client fields
- Status values explained
- Format guidelines

#### Client Archiving (NEW)

**Archive a Client:**
- Soft delete (sets `archived_at` date)
- Hides from standard views
- Preserves all related data
- Can be restored later

**Restore a Client:**
- Clears `archived_at` date
- Returns to active views
- All data intact

**Hard Delete:**
- Only available if client has NO:
  - Projects
  - Invoices
  - Proposals
  - Contracts
  - Time entries
  - Other related records
- Permanently removes client
- Cannot be undone

**When to Archive vs Delete:**
- **Archive**: Client relationship ended but you want to keep history
- **Delete**: Test/duplicate client with no data

---

## Projects

Manage all your client projects and associated tasks.

### Project List (`/projects`)

#### View Options

- **Grid View**: Visual cards with icons
- **List View**: Compact table format
- Toggle between views with button in toolbar

#### Filters & Search

- **Search Bar**: Search by project name or client name
- **Status Filter**:
  - All
  - Active
  - On Hold
  - Completed
  - Cancelled

#### Project Cards Display

Each project card shows:
- Emoji/color icon
- Project name
- Client name (linked)
- Status badge
- Budget amount
- Hourly rate
- Start and due dates
- Progress indicators

### Creating a Project

Click **Add Project** to open the creation dialog.

#### Project Fields

**Required:**
- **Project Name**

**Optional:**
- **Description** - Project details and notes
- **Client** - Select from your clients (or none)
- **Status** - Active (default), On Hold, Completed, Cancelled
- **Budget** - Project budget amount
- **Hourly Rate** - Default rate for time entries
- **Start Date** - Project start date
- **Due Date** - Project deadline
- **Icon** - Emoji picker + color picker for visual identity

#### Actions

- **Save** - Create the project
- **Cancel** - Close without saving

### Editing a Project

From the project list:
- Click the menu on any project card
- Select **Edit**
- Update any fields
- **Save** or **Cancel**

### Deleting a Project

**Warning**: Deleting a project will also delete:
- All tasks in the project
- All project-specific statuses
- Links to time entries (entries remain, but project reference removed)

**To Delete:**
1. Click menu on project card
2. Select **Delete**
3. Confirm deletion in dialog
4. Type project name to confirm (for safety)

---

## Project Detail & Tasks

Click any project to view full details and manage tasks.

### Project Header

Displays at the top:
- Project icon (emoji/color)
- Project name
- Client name (clickable link)
- Status badge
- **Edit Project** button (navigates to edit dialog)
- **Delete Project** button (with confirmation)

### Task Views

Switch between two view modes:

#### Kanban Board View (Default)

**Visual column-based workflow:**
- Drag and drop tasks between columns
- Each column represents a status
- Visual priority indicators (colors)
- Quick add task to any column

**Default Columns** (when project is first created):
- Haven't Started
- In Progress
- Review
- Done (marked as completion column)

**Custom Columns:**
- Click **Manage Statuses** to customize
- Add new columns
- Rename existing columns
- Reorder columns (drag and drop)
- Change column colors
- Mark which columns indicate "done"
- Delete unused columns

#### List View

**Table format for quick edits:**
- All tasks in sortable table
- Inline editing for:
  - Title
  - Priority
  - Due date
  - Estimated hours
- Click any row to open detail sheet
- Filters and sorting options

### Task Management

#### Task Fields

**Core Information:**
- **Title** (required)
- **Description** (rich text)
- **Status** - Uses project's custom columns
- **Priority**: Low, Medium, High, Urgent
- **Due Date**
- **Estimated Hours**

#### Creating Tasks

**Quick Add (Kanban View):**
1. Click **+** button on any column
2. Enter task title
3. Task created in that column

**Full Form:**
1. Click **Add Task**
2. Fill in all fields
3. **Save**

#### Task Detail Sheet

Click any task to open full details:

**Tabs:**

**1. Details Tab**
- Edit all task fields
- Change status via dropdown
- Update priority
- Set/change due date
- Adjust estimated hours

**2. Comments Tab**
- View all task comments
- Add new comments
- Comments show author and timestamp
- Only you can see comments (no team features yet)

**3. Time Tab**
- Shows all time entries logged to this task
- Total hours tracked
- Links to full time entries

**Actions Available:**
- **Duplicate Task** - Create a copy
- **Delete Task** - Remove permanently (with confirmation)
- **Save Changes** - Update task
- **Close** - Exit detail view

#### Task Filters

In both Kanban and List views:

- **Status Filter** - Show/hide specific columns
- **Priority Filter** - Filter by priority level
- **Hide Done** - Toggle visibility of completed tasks

#### CSV Operations

**Tasks Import/Export:**
- Download task template (project-specific)
- Export current project tasks
- Bulk import tasks from CSV
- Matches project's custom statuses

### Project Time Entries

Below tasks, see a table of all time logged to this project:
- Description
- Date
- Duration
- Task (if linked)
- Billable status

---

## Time Tracking

Track time spent on projects and tasks with manual entries or a built-in timer.

### Three Time Views

#### 1. Timesheet (`/time`)

**Weekly/Monthly Calendar View:**
- Visual calendar grid
- Shows time entries by day
- Drag to select time ranges (future feature)
- Quick overview of your week/month

**What You See:**
- Total hours per day
- Entries grouped by project
- Visual color coding

#### 2. Timer (`/time/timer`)

**Active Timer Interface:**

**Timer Display:**
- Large elapsed time counter
- Currently running project/task
- Description of what you're working on
- Start/stop controls

**Timer Fields:**
- **Description** - What are you working on?
- **Project** (required) - Select from your projects
- **Task** (optional) - Select from project tasks
- **Billable Toggle** - Mark as billable or non-billable

**Timer Controls:**
- **Start** - Begin tracking time
- **Stop** - Pause the current segment
- **Log Time** - Save entry to database
- **Discard Segment** - Remove current segment
- **Resume** - Continue existing draft entry

**Timer Persistence:**
- Timer state saves automatically (localStorage)
- Survives page refreshes
- Survives navigation (timer continues while you browse)
- Draft segments preserved until you log or discard

**Hourly Rate:**
Timer automatically uses:
1. Project hourly rate (if set), OR
2. Your default hourly rate (from profile settings)

#### 3. All Logs (`/time/history`)

**Complete Time Entry History:**

**Filters Available:**
- **Date Range**:
  - This Week
  - This Month
  - Last 90 Days
  - Custom Date Range
  - All Time
- **Status**:
  - All
  - Billable
  - Unbillable
  - Billed (included in an invoice)
  - Paid (invoice marked paid)
- **Project** - Filter by specific project
- **Search** - Search descriptions

**Table Columns:**
- Date
- Description
- Project name
- Task name (if linked)
- Duration (precise to the second)
- Billable status
- Hourly rate
- Amount (duration × rate)
- Billing status

**Actions Per Entry:**
- **Edit** - Modify entry details
- **Delete** - Remove entry
- **Select** - Bulk selection for operations

### Manual Time Entry

Click **Manual Log** or **Edit** an existing entry to open the form.

#### Two Input Modes

**Mode 1: Manual Hours**
- Enter hours directly
- Simple duration input
- Good for end-of-day logging

**Mode 2: Start/End Times**
- Specify exact start and end times
- Can add multiple time ranges
- Better for detailed tracking
- Good for retroactive logging

#### Entry Fields

**Required:**
- **Project** - Must select a project
- **Date** - When the work occurred
- **Duration** OR **Time Ranges**

**Optional:**
- **Task** - Link to specific task
- **Description** - What you worked on
- **Billable** - Toggle billable/non-billable
- **Hourly Rate** - Override default rate

#### Saving Manual Entries

- **Save** - Create/update entry
- **Cancel** - Discard changes

### Timer Bar (Global)

When timer is running, a bar appears at the bottom of your screen:

**Displays:**
- Current elapsed time
- Project/task being tracked
- Brief description

**Controls:**
- Quick stop button
- Click to open full timer page

**Available Everywhere:**
Timer continues running while you:
- Navigate to other pages
- Edit clients or projects
- Create invoices
- Use any part of the app

### CSV Operations

**Export Time Entries:**
- Download filtered time logs
- Includes all fields
- Useful for external billing systems

**Import Time Entries:**
- Download CSV template
- Bulk upload time data
- Project and task must exist

### Connection to Invoicing

Time entries marked as **billable** will:
- Show as "unbilled" in Dashboard stats
- Be available to import into invoices
- Track billing status (unbilled → billed → paid)
- Link to invoice when included (audit trail)

**Billing Status Flow:**
1. **Unbilled** - Billable entry not yet invoiced
2. **Billed** - Included in sent invoice
3. **Paid** - Invoice marked as paid
4. **Not Billable** - Internal time, won't show in invoice import

---

## Invoices

Create, send, and manage client invoices with PDF generation.

### Invoice List (`/invoices`)

#### Overview Stats

At the top of the page:
- Total invoice count
- Total amount by status (Draft, Sent, Paid)
- Overdue count and amount

#### Filters & Search

**Status Filters:**
- All
- Draft
- Sent
- Paid
- Overdue

**Additional Filters:**
- **Date Range**:
  - All
  - This Week
  - This Month
  - Last 90 Days
  - Custom Range
- **Client** - Filter by specific client
- **Project** - Filter by specific project
- **Search** - Search invoice numbers

#### Invoice Cards/Rows

Each invoice displays:
- Invoice number
- Client name
- Status badge
- Issue date
- Due date
- Total amount
- Actions menu

### Creating an Invoice

Click **New Invoice** to open the creation dialog.

#### Initial Setup Fields

**Required:**
- **Client** - Select from your clients
- **Issue Date** - When invoice is created
- **Due Date** - When payment is due

**Optional:**
- **Project** - Link to specific project (filters by selected client)
- **Tax** - Select from your tax presets

#### Setup Warnings

If you haven't completed your business profile, you'll see warnings for missing:
- Business name
- Business email
- Business address
- Bank details

**Why This Matters:**
These fields appear on your invoice PDF. Complete them in Settings > Company before sending invoices to clients.

#### After Creating

Click **Create Invoice**:
- Invoice created in **Draft** status
- Assigned unique invoice number
- Navigates to Invoice Detail page
- Ready to add line items

### Invoice Detail (`/invoices/:id`)

Full invoice editing and management interface.

#### Invoice Statuses

**Draft**:
- Fully editable
- Can add/remove items freely
- Not visible to client
- Can be deleted

**Sent**:
- Read-only by default
- Click **Edit Invoice** button to enable editing
- Client can view via email or portal
- Cannot be deleted

**Paid**:
- Read-only by default
- Click **Edit Invoice** button to enable editing
- Recorded as paid with payment date
- Can be reopened if needed

**Overdue**:
- Automatically applied when due date passes
- Sent invoices past due date
- Still editable (same as Sent)

**Cancelled**:
- Manually cancelled invoice
- Kept for records

#### Line Items

**Adding Line Items:**

**Method 1: Manual Entry**
1. Click **Add Line Item**
2. Fill in fields:
   - **Description** (required)
   - **Quantity** (default: 1)
   - **Unit Price**
   - **Line Date** (optional - date of service)
   - **Amount** (auto-calculated: quantity × unit price)
3. Click **+** to add another or **Save**

**Method 2: Import from Time**
1. Click **Import from Time**
2. View all unbilled time entries for this client/project
3. Select entries to import
4. Click **Import Selected**
5. Time entries convert to line items:
   - Description from time entry
   - Quantity = hours
   - Rate = hourly rate
   - Amount auto-calculated

**Managing Line Items:**
- **Edit** - Click any field to modify
- **Delete** - Remove line item
- **Reorder** - Drag and drop (if enabled)

**Display Options** (from your settings):
- Show/hide Quantity column
- Show/hide Unit Price column
- Show/hide Line Date column

#### Invoice Fields

**Dates:**
- **Issue Date** - When invoice was created
- **Due Date** - When payment is due
- **Paid Date** - Automatically set when marked paid

**Financial:**
- **Subtotal** - Sum of all line items (auto-calculated)
- **Tax** - Select tax preset, applies percentage
- **Tax Amount** - Calculated from subtotal (auto)
- **Discount** - Optional discount amount (future feature)
- **Total** - Final amount due (auto-calculated)
- **Currency** - From client or your default

**Content:**
- **Invoice Notes** - Visible to client, above line items
- **Invoice Footer** - Visible to client, below line items
- **Bank Details** - Payment instructions for client

**Defaults:**
Notes, footer, and bank details pre-fill from Settings > Invoices if you've set defaults.

#### Actions & Operations

**While Editing:**
- **Save Invoice** - Save all changes
- **Discard Changes** - Revert unsaved changes

**Preview & Send:**
- **Preview** - View invoice as client will see it (HTML preview styled like PDF)
- **Send Invoice** - Open email dialog

**Email Invoice:**
1. Click **Send Invoice**
2. Choose mode:
   - **Send** - First time sending
   - **Reminder** - Follow-up for unpaid invoice
   - **Receipt** - After payment received
3. Fill in email:
   - **To** (required) - Client email (pre-filled)
   - **CC** - Additional recipients (comma-separated)
   - **Subject** - Email subject line (pre-filled from template)
   - **Message** - Email body (pre-filled from template)
4. Edit subject/message using **merge tags** (see below)
5. Click **Send**

Invoice PDF automatically attached to email.

**Merge Tags Available:**
- `{{client_name}}` - Client's full name
- `{{invoice_number}}` - Invoice number
- `{{project_name}}` - Project name (if linked)
- `{{due_date}}` - Formatted due date
- `{{business_name}}` - Your business name
- `{{total}}` - Formatted total amount

**Status Management:**
- **Mark as Sent** - Change status to Sent (if you sent via other means)
- **Mark as Paid** - Record payment, sets paid date
- **Reopen Paid Invoice** - Change back to Sent if needed
- **Cancel Invoice** - Change status to Cancelled

**Other Actions:**
- **Download PDF** - Download invoice as PDF file
- **Print** - Print invoice (uses preview)
- **Duplicate** - Create copy as new draft
- **Delete** - Remove invoice (draft only)

**Edit Lock:**
When invoice status is Sent or Paid, fields are read-only until you click **Edit Invoice** button. This prevents accidental changes to sent invoices.

### CSV Operations

**Export Invoices:**
- Download all invoices as CSV
- Includes all fields and line items

**Import Invoices:**
- Download CSV template
- Bulk create invoices
- Client and project must exist

### Invoice Numbering

Invoice numbers are automatically generated using your settings:

**Format:** `[Prefix][Year][Number]`

**Example:** `INV-2026-00001`

**Configuration** (in Settings > Invoices):
- Prefix (e.g., "INV")
- Include year (toggle)
- Starting number
- Number padding (1-6 digits)
- Reset yearly (toggle)

**Behavior:**
- Atomic increment (no duplicates)
- Sequential numbering
- Survives drafts/deletions (no gaps by design)

### Deep Linking

**From Reviews:**
When viewing an approval request detail, click **Create Invoice**:
- Opens new invoice dialog
- Client and project pre-filled
- URL parameter: `?from_review=1`

---

## Services

**NEW FEATURE (May 2026)**

Build a catalog of your service offerings to reuse in proposals and contracts.

### Service List (`/services`)

View all your services with:
- Service name
- Price (if set)
- Recurring indicator
- Description preview

**Stats Displayed:**
- Total services
- Count of recurring services

### Creating a Service

Click **Add Service** to open the form.

#### Service Fields

**Required:**
- **Service Name** - Clear, descriptive name

**Optional:**
- **Description** - Detailed description of what's included
- **Price** - Default price for this service
  - Must be greater than 0 if provided
  - Leave blank for variable pricing
- **Currency** - Defaults to your profile currency
- **Recurring Toggle** - Mark as recurring service
- **Recurrence Period** - If recurring:
  - Monthly
  - Annually
- **Default Tasks** - Checklist of deliverables
  - Add multiple task items
  - These auto-populate when creating projects from proposals

#### Actions

- **Save Service** - Add to catalog
- **Cancel** - Close without saving

### Managing Services

**Edit Service:**
- Click any service card
- Update fields
- Save changes

**Delete Service:**
- Click delete button
- Confirm deletion
- **Note**: Deleted services remain in existing proposals/contracts (historical record)

### Using Services

Services can be added to:
- **Proposals** - Select services to include in proposal
- **Contracts** - Import services from accepted proposals or add directly
- **Future**: May integrate with invoicing

**Benefits:**
- Consistency in pricing and descriptions
- Faster proposal/contract creation
- Track which services are most popular
- Easy updates to your offerings

---

## Proposals

**NEW FEATURE (May 2026) - BETA**

Create and send professional proposals to clients.

### Proposal List (`/proposals`)

#### Status Filters

- **All** - All proposals
- **Draft** - Not yet sent
- **Sent** - Sent to client
- **Read** - Client has viewed
- **Accepted** - Client accepted
- **Archived** - Archived proposals

#### Proposal Cards

Each proposal shows:
- **Identifier** - Auto-generated (format: `P-YYYY-#####`)
- Client name
- Project name (if linked)
- Status badge
- Total amount
- Created date
- Actions menu

#### Stats Dashboard

- Total proposals
- Acceptance rate
- Total value of accepted proposals
- Pending proposals count

### Creating a Proposal

Click **New Proposal** to start.

#### Initial Setup

**Required:**
- **Client** - Select from your clients

**Optional:**
- **Project** - Link to existing project
- Defaults from Settings > Proposals will pre-fill:
  - Cover image
  - Main color
  - Validity days
  - Payment structure
  - Payment methods
  - Conditions/notes

### Proposal Detail (`/proposals/:id`)

Full proposal builder with comprehensive options.

#### Proposal Identifier

Automatically generated, format: **P-YYYY-#####**
- P = Proposal
- YYYY = Year
- ##### = Sequential number

**Cannot be edited** - ensures unique tracking.

#### Header Section

**Cover Image:**
- Upload custom image (max 10 MB)
- Recommended size: 1500×500 pixels
- Displays at top of proposal

**Main Color:**
- Choose brand color for proposal
- Affects headers and accents

**Client & Project:**
- Select or change client
- Optionally link to project
- Client details frozen when sent (historical accuracy)

#### Content Sections

**Objective:**
- Brief project goal statement
- Visible to client at top of proposal

**Presentation Text:**
- Main proposal body
- Rich text editor
- Explain your approach, process, value proposition
- Format with headings, lists, bold, etc.

#### Services Section

Add services to your proposal:

**From Service Catalog:**
1. Click **Add Service**
2. Select from your services catalog
3. Pre-fills name, description, price, recurring status
4. Edit if needed for this proposal

**Custom Service:**
1. Click **Add Custom Service**
2. Manually enter:
   - Service name
   - Description
   - Price
   - Recurring toggle
   - Recurrence period

**Managing Services:**
- **Reorder** - Drag and drop services
- **Edit** - Modify any field
- **Delete** - Remove service
- **Subtotal** - Auto-calculates from all services

#### Project Details

**Timeline:**
- **Timeline Days** - How long project will take
- Auto-calculates end date from acceptance

**Availability:**
- **Availability Requirement** - Text field
- Example: "Available to start within 2 weeks"
- Or use toggle for "Immediate availability"

**Validity:**
- **Validity Days** - How long proposal is valid
- Default: 30 days (configurable in settings)
- Minimum: 1 day
- Expiry date auto-calculated

#### Payment Structure

Choose one:

**Upfront Payment:**
- Full payment before project starts
- Simpler for small projects

**Installments:**
- Split payment into milestones
- Add **Installment Description**
- Example: "50% upfront, 50% on completion"

**Payment Methods:**
Multi-select from:
- Bank Transfer
- Credit Card
- Debit Card
- PayPal
- Stripe
- Cryptocurrency
- Other (specify)

#### Financial

**Discount** (optional):
- Amount or percentage off
- Applied to subtotal
- Shows discount line in client view

**Total:**
Auto-calculated:
- Sum of service prices
- Minus discount
- Displays in chosen currency

#### Terms & Conditions

**Conditions/Notes:**
- Additional terms
- Cancellation policy
- Revisions included
- Important legal notes
- Pre-fills from settings default

#### Actions

**While Editing (Draft):**
- **Save** - Save all changes
- **Preview** - See client view
- **Delete** - Remove proposal

**After Saving:**
- **Send to Client** - Email proposal link
- **Copy Link** - Copy public URL
- **Mark as Sent** - Manually mark sent (if sent via other means)
- **Duplicate** - Create copy as new draft

### Sending a Proposal

1. Click **Send to Client**
2. Email dialog opens:
   - **To** - Client email (pre-filled)
   - **Subject** - Pre-filled, editable
   - **Message** - Pre-filled template, editable
3. Click **Send**
4. Client receives email with link to view proposal
5. Status changes to **Sent**

### Client Proposal Experience

Client receives email with link to: `/proposal/:token`

**No login required** - Token-based access

**Client Can:**
- View full proposal
- See all services and pricing
- Read terms and conditions
- Click **Accept Proposal** button
- Status changes to **Accepted**
- You receive notification

### After Acceptance

When client accepts:
1. Status changes to **Accepted**
2. You receive in-app notification
3. `accepted_at` date recorded
4. Option to **Create Contract from Proposal**
5. Client data frozen (snapshot)

### Proposal Settings

Configure defaults in **Settings > Proposals**:
- Default cover image
- Main color theme
- Default validity days
- Availability requirement text
- Payment structure preference
- Payment methods list
- Default conditions/notes

These pre-fill new proposals for consistency and speed.

---

## Contracts

**NEW FEATURE (May 2026) - BETA**

Create, send, and manage legally binding contracts with dual-party signing.

### Access

Contracts feature visibility controlled by environment setting:

**Access Modes:**
- **Off** - No one can access contracts
- **Admin** - Only admin users (default)
- **On** - All authenticated users

**Check with your administrator** if you don't see the Contracts menu item.

### Contract List (`/contracts`)

#### Two Tabs

**1. Contracts Tab**
Lists all your contracts with filters:
- All
- Draft
- Pending Signatures
- Signed
- Cancelled

**2. Templates Tab**
Manage reusable contract templates.

#### Contract Cards

Each contract shows:
- **Identifier** - Auto-generated (format: `C-YYYY-#####`)
- Client name
- Status badge with signature progress
- Total amount
- Created date
- Actions menu

### Creating a Contract

Click **New Contract** to start.

#### Initial Steps

**1. Accept Disclaimer (First Time Only)**

**Lance Service Agreement Disclaimer:**
> Lance provides contract template features as a tool. We recommend having contracts reviewed by a qualified attorney. Use at your own risk.

- Check "I understand and agree"
- Stored in browser (won't ask again)

**2. Choose Import Method**

**Option A: Import from Proposal**
- Select an **Accepted** proposal
- Client, project, and services auto-fill
- Saves time, ensures consistency

**Option B: Start from Scratch**
- Select client manually
- Optionally link project
- Add services manually later

**3. Select Template**

- Choose from your contract templates
- Default template: "Service Agreement"
- Auto-created on first contract creation
- Can customize in Templates tab

### Contract Detail (`/contracts/:id`)

Full contract builder with party details and terms.

#### Contract Identifier

Auto-generated, format: **C-YYYY-#####**
- C = Contract
- YYYY = Year
- ##### = Sequential number

**Cannot be edited** - ensures unique tracking.

#### Party Information

**Freelancer/Agency (You):**
- Name
- Email
- Phone
- Address (street, city, state, postal code, country)
- Entity Type: Individual or Company
- Pre-fills from your business settings

**Client:**
- Name
- Email
- Phone
- Address (full)
- Entity Type: Individual or Company
- Pre-fills from client record
- Client can update their details before signing

#### Contract Template

Shows template name used.
**Cannot change template** after contract is created (content is fixed).

**Template Content:**
- HTML-based legal text
- Uses variable placeholders
- Variables auto-replaced:
  - `{{freelancer_name}}`
  - `{{client_name}}`
  - `{{services_list}}`
  - `{{total_amount}}`
  - `{{timeline}}`
  - Etc.

#### Services

Add services to define scope of work:

**From Proposal:**
If imported, services pre-fill.

**Manual Addition:**
1. Click **Add Service**
2. Select from catalog or create custom
3. Fields: Name, description, price, recurring

**Service List:**
- Shows all services
- Reorder with drag-and-drop
- Edit or delete services
- Subtotal auto-calculates

#### Contract Terms

**Timeline:**
- Text field describing project duration
- Example: "6 weeks from signing" or "12 weeks"

**Payment Terms:**
- Text field for payment schedule
- Example: "Net 30" or "50% upfront, 50% on completion"

**Additional Clause:**
- Custom terms specific to this contract
- Optional field
- Example: "Includes 2 rounds of revisions"

#### Financial

**Discount:**
- Amount or percentage
- Applied to services subtotal

**Total:**
Auto-calculated final contract amount.

#### Actions by Status

**Draft Status:**
- **Save** - Save changes
- **Preview** - View contract as PDF
- **Sign as Freelancer** - Record your signature
- **Delete** - Remove draft

**After You Sign:**
- **Send to Client** - Email contract link
- Status changes to **Pending Signatures**
- **⚠️ Contract Lock**: Core fields become read-only (enforced by database)

**Pending Signatures:**
- **View Status** - Check if client has signed
- **Resend to Client** - Email reminder
- **Cancel Contract** - Cancel with reason

**Fully Signed:**
- **Download PDF** - Save signed contract
- **View Contract** - Read-only view
- Contract complete!

**Cancelled:**
- View only
- Includes cancellation reason
- Preserved for records

### Contract Lock (Important)

After you send the contract to the client:
- Status changes to **Pending Signatures**
- `sent_at` timestamp recorded
- **Database trigger prevents editing** core fields:
  - Party information
  - Services
  - Financial terms
  - Template content

**Why:** Ensures contract integrity once sent to client. You and client are signing the same document.

**What You Can Still Edit:**
- Internal notes (if added in future versions)
- Metadata (tags, etc. if added)

**To Make Changes:**
Must cancel and create new contract.

### Client Signing Process

Client receives email with link to: `/contract/:token`

**Client Experience:**

1. **View Contract**
   - Read full contract
   - Review all services and terms
   - No login required (token-based)

2. **Update Details** (Optional)
   - Client can update their own information
   - Name, email, phone, address
   - Ensures accuracy

3. **Request OTP**
   - Click **Sign Contract**
   - Enter email address
   - Receives 6-digit OTP code via email
   - OTP expires in 15 minutes

4. **Verify & Sign**
   - Enter OTP code
   - Click **Verify & Sign**
   - Signature recorded with timestamp

5. **Both Signed**
   - Status changes to **Signed**
   - Both parties receive confirmation
   - `freelancer_signed_at` and `client_signed_at` recorded

### Contract Templates

Manage reusable contract templates in the **Templates** tab.

#### Default Template

**"Service Agreement"**:
- Auto-created when you create your first contract
- Basic freelance service agreement
- Can be edited
- Can be set as default

#### Creating a Template

1. Click **New Template**
2. Fill in fields:
   - **Template Name** - Internal name
   - **Description** - What this template is for
   - **Content** - HTML-based legal text

**Content Tips:**
- Use HTML for formatting
- Use variable placeholders (see below)
- Include standard sections:
  - Scope of Work
  - Payment Terms
  - Timeline
  - Termination
  - Confidentiality
  - Intellectual Property
  - Liability
  - Dispute Resolution

**Variable Placeholders:**
```
{{freelancer_name}}
{{freelancer_email}}
{{freelancer_address}}
{{client_name}}
{{client_email}}
{{client_address}}
{{services_list}}
{{total_amount}}
{{timeline}}
{{payment_terms}}
{{additional_clause}}
```

These get replaced with actual data when contract is generated.

#### Managing Templates

**Edit Template:**
- Click template card
- Modify name, description, or content
- Save changes

**Set as Default:**
- Click "Set as Default" on any template
- This template pre-selected for new contracts

**Delete Template:**
- Remove unused template
- **Cannot delete** if used in existing contracts
- Contracts keep their original content (no problem)

**⚠️ Important:**
- Seek legal advice for contract content
- Lance provides tools, not legal services
- Ensure compliance with your jurisdiction

### Cancelling a Contract

Any status can be cancelled:

1. Click **Cancel Contract**
2. Enter cancellation reason (required)
3. Confirm cancellation
4. Status changes to **Cancelled**
5. Reason stored in contract record
6. Both parties notified (if applicable)

**Cancelled contracts:**
- Remain in your list
- Preserved for records
- Cannot be reactivated (create new if needed)

---

## Approvals

**Feature Name:** Approvals (previously "Reviews")
**Badge:** Beta

Get client approval on creative work, designs, mockups, and deliverables.

### Approval List (`/reviews`)

#### View Options

- **Grid View** - Visual cards with previews
- **List View** - Compact table format

#### Organization

**Folders:**
Create folders to organize approvals by:
- Client
- Project
- Phase
- Type
- Custom categories

**Each Folder Has:**
- Name
- Emoji icon
- Color
- Count of approvals inside

**Folder Actions:**
- Create folder
- Rename folder
- Change emoji/color
- Delete folder (moves approvals to "No folder")

#### Filters

- **Status**: All, Pending, Approved, Rejected, Commented
- **Client**: Filter by specific client
- **Project**: Filter by specific project
- **Folder**: View specific folder contents

#### Approval Cards

Each approval shows:
- Title
- Status badge
- Client name
- Number of files
- Number of comments
- Version number
- Due date (if set)
- Preview thumbnail (if images)

### Creating an Approval Request

Click **New Approval** to start.

#### Required Fields

- **Title** - Clear name for this approval
- **Client** - Who will review
- **At least one file** - Must upload file(s)

#### Optional Fields

- **Description** - Context for client
- **Version** - Version number (default: "1")
- **Project** - Link to project
- **Folder** - Organize into folder
- **Due Date** - When you need approval by
- **Recipients** - Email addresses for notifications
  - Client email auto-added
  - Add additional stakeholders

#### File Upload

**Uploading Files:**
1. Click **Upload Files** or drag-and-drop
2. Multiple files supported
3. Uploads to secure storage
4. Progress indicator shows

**Supported File Types:**
- Images (PNG, JPG, GIF, SVG, etc.)
- PDFs
- Videos
- Documents
- Other file types

**File Size:**
Files count toward your 200 MB storage limit.

#### Actions

- **Create** - Save and create approval request
- **Cancel** - Discard

### Approval Detail (`/reviews/:id`)

Manage individual approval requests.

#### Header Actions

**Share & Send:**
- **Copy Link** - Copy public approval URL
- **View as Client** - Preview client experience
- **Send to Client** - Email with link
- **Send Reminder** - Follow-up email

**Management:**
- **Move to Folder** - Change organization
- **Delete Request** - Remove entirely (deletes files from storage)

#### Files Section

**File Grid:**
Shows all uploaded files with:
- Thumbnail preview (for images)
- Filename
- File size
- Upload date

**File Actions:**
- **Add More Files** - Upload additional files
- **Delete File** - Remove file (frees storage)
  - **⚠️ Warning**: If you delete last file, entire approval request is deleted

**Viewing Files:**
- Click any file to open full viewer
- Image viewer with zoom
- PDF viewer
- Download option

#### Comments Section

Shows all client comments and feedback:
- Commenter name and email
- Comment text
- Timestamp
- Associated file (if pinned)
- X/Y position (if pinned to location on image)

**Your Actions:**
- View all comments
- No reply feature (client adds comments, you act on feedback)

#### Status Management

**Current Status:**
- Pending - Awaiting review
- Commented - Client left feedback
- Approved - Client approved
- Rejected - Client rejected

**Status Changes:**
Controlled by client actions on public page.

#### Create Invoice

After approval, optionally:
- Click **Create Invoice**
- Opens new invoice dialog
- Client and project pre-filled
- Convenient billing workflow

### Public Client Approval Page

Client accesses via: `/review/:token`

**No login required** - Secure token-based access

#### Client Identity

**First Visit:**
Client prompted to enter:
- Name
- Email address

**Stored in Browser:**
- Saves to localStorage
- Pre-fills on return visits
- Used to identify comments

#### File Viewer

**Image Viewer:**
- Full-screen image display
- **Zoom in/out** controls
- Pan around image
- **Pin Comments** - Click on image to add comment at specific location
  - X/Y coordinates recorded
  - Comment appears at that spot
  - Visual feedback indicators

**Document Viewer:**
- PDF and document preview
- Download option
- General comments (not pinned)

**Navigation:**
- Previous/Next file buttons
- Thumbnail sidebar
- File counter (e.g., "3 of 8")

#### Client Actions

**Add Comment:**
1. Click **Add Comment** or click on image
2. Enter comment text
3. Submit
4. Comment saved with:
   - Name and email
   - Timestamp
   - File association
   - Position (if pinned)

**Edit Comment:**
- Only own comments (matched by email)
- Click edit icon
- Modify text
- Save changes

**Delete Comment:**
- Only own comments
- Click delete icon
- Confirm deletion

**Approve Entire Request:**
- Click **Approve** button
- Confirmation dialog
- Status changes to **Approved**
- You receive notification

**Reject Request:**
- Click **Reject** button
- Confirmation dialog
- Status changes to **Rejected**
- You receive notification
- Typically includes comments explaining why

#### Upload Files (Client)

Clients can also upload files:
- Click **Upload File**
- Select file from device
- Adds to approval request
- Useful for:
  - Reference materials
  - Alternative designs
  - Source files

### Storage Management

**File Storage:**
- Each file size tracked
- Counts toward your 200 MB limit
- View usage in Settings > Storage

**Deleting Files:**
- Frees up storage immediately
- Updates usage calculation
- Cannot be undone

**⚠️ Last File Warning:**
Deleting the last file in an approval request will delete the entire request (all comments and data). Confirm carefully!

---

## Notes

Personal note-taking workspace with rich text editing.

**Access:** Via Dashboard quick actions or search results (not in main sidebar).

### Notes Interface

Two-panel layout:

#### Left Sidebar

**Actions:**
- **New Note** - Create blank note
- **Create Folder** - Organize notes

**Folder List:**
- Shows all folders
- Click to filter notes
- Folder emoji and color
- Note count per folder

**Note List:**
- All notes (or filtered by folder/tag)
- Note title
- Brief excerpt from content
- Folder indicator (if assigned)
- Click to open in editor

**Filters:**
- **Folder**: All, None, or specific folder
- **Tag**: Filter by tag name
- **Clear Filters**: Reset to all notes

#### Right Panel: Note Editor

Full-featured rich text editor.

### Creating a Note

1. Click **New Note**
2. Default title: "New Note [date]"
3. Empty editor ready
4. Start typing

### Note Fields

**Title:**
- Click to edit
- Inline editing
- Required (uses default if left empty)

**Content:**
Rich text editor (Quill-based) with:
- **Bold**, *Italic*, Underline
- Headings (H1, H2, H3)
- Bulleted lists
- Numbered lists
- **Links** - Hyperlinks
- **Images** - Upload inline images
- **Blockquotes** - For emphasis
- **Horizontal Divider** - Section breaks

**Special Features:**

**Entity Links:**
- Link to clients
- Link to projects
- Click links to navigate

**Create Task from Selection:**
1. Highlight text in note
2. Click **Create Task** button
3. Dialog opens:
   - Task title pre-filled with selected text
   - **Project** selector (required)
   - Task created in first status column of project

**Note Properties:**

**Tags:**
- Add multiple tags
- Comma-separated
- Use for flexible organization
- Filter by tag in sidebar

**Icon Emoji:**
- Choose emoji icon for note
- Visual identification
- Shows in note list

**Cover Color:**
- Color picker
- 8 preset colors
- Visual organization

**Comment:**
- Internal note about this note
- Not part of main content
- Metadata field

**Folder:**
- Assign to folder
- Select from dropdown
- Can be "None"

**Client Link:**
- Optionally link to client
- Contextual association

**Project Link:**
- Optionally link to project
- Contextual association

### Auto-Save

**Automatic Saving:**
- Saves after **800ms** of inactivity
- No manual save button needed
- Save indicator shows status

**Behavior:**
- Type or edit
- Stop typing
- Wait 800ms
- Saves automatically
- "Saved" indicator appears

### Note Actions

**Download:**
- Click **Download** button
- Exports as **.doc** file
- Microsoft Word-compatible HTML format
- Useful for:
  - Sharing with clients
  - Archiving
  - Printing

**Delete:**
- Click **Delete** button
- Confirmation dialog
- Permanently removes note
- Cannot be undone

### Managing Folders

**Create Folder:**
1. Click **Create Folder**
2. Enter folder name
3. Choose emoji
4. Choose color (8 presets)
5. Save

**Edit Folder:**
- Click folder in list
- Modify name, emoji, or color
- Save changes

**Delete Folder:**
- Click delete on folder
- Confirm deletion
- Notes in folder move to "No folder"
- Notes themselves not deleted

### Deep Linking

**Open Specific Note:**
URL format: `/notes?open={noteId}`

**Use Cases:**
- Search results link to specific note
- Bookmarks
- Links from other notes
- Dashboard links

### Search Integration

Notes are searchable from global search:
- Searches note **title**
- Searches note **content** (HTML)
- Click result to open note

---

## Notifications

Stay informed about important events in your account.

### Notification Feed (`/notifications`)

#### Notification List

**Each Notification Shows:**
- **Type** indicator (icon)
- **Title** - Brief summary
- **Body** - Detailed message
- **Link** - Click to view related item
- **Read Status** - Unread (bold) or read
- **Timestamp** - Relative time (e.g., "2 hours ago")

#### Notification Types

**Invoices:**
- Invoice due soon
- Invoice overdue
- Invoice paid

**Approvals:**
- New comment on approval
- Approval approved by client
- Approval rejected by client
- Approval due soon
- Approval overdue

**Proposals:**
- Proposal viewed by client
- Proposal accepted by client

**Contracts:**
- You signed contract
- Client signed contract
- Contract fully signed
- Contract cancelled
- Contract due soon
- Contract overdue

**Projects:**
- Project due soon
- Project overdue

**Tasks:**
- Task due soon
- Task overdue

**System:**
- Trial ending soon
- Product updates (if opted in)
- Feature announcements

#### Actions

**Per Notification:**
- **Mark as Read** - Mark single notification read
- **Delete** - Remove single notification
- Click notification body to visit related item

**Bulk Actions:**
- **Mark All as Read** - Clear all unread badges
- **Delete All** - Clear entire notification feed (with confirmation)

#### Sidebar Badge

Unread count badge shows in main navigation:
- Live updates (realtime)
- Shows total unread count
- Click to view notifications

### Notification Settings

Configure what notifications you receive in **Settings > Notifications**.

#### Notification Channels

**In-App:**
- Shows in notification feed
- Badge count
- Always available for all types

**Email:**
- Receive via email
- Optional for most types
- Some types in-app only

#### Categories & Controls

**Invoices:**
- Due Soon - In-app ✅ | Email ✅
- Overdue - In-app ✅ | Email ✅

**Approvals:**
- New Comment - In-app ✅ | Email ✅
- Approved/Rejected - In-app ✅ | Email ✅
- Due Soon - In-app ✅ | Email ✅
- Overdue - In-app ✅ | Email ✅

**Proposals:**
- Viewed by Client - In-app ✅ | Email ✅
- Accepted by Client - In-app ✅ | Email ✅

**Contracts:**
- You Signed - In-app ✅ | Email ✅
- Client Signed - In-app ✅ | Email ✅
- Fully Signed - In-app ✅ | Email ✅
- Cancelled - In-app ✅ | Email ✅
- Due Soon - In-app ✅ | Email ✅
- Overdue - In-app ✅ | Email ✅

**Projects:**
- Due Soon - In-app ✅ | Email ❌ (disabled)
- Overdue - In-app ✅ | Email ❌ (disabled)

**Tasks:**
- Due Soon - In-app ✅ | Email ❌ (disabled)
- Overdue - In-app ✅ | Email ❌ (disabled)

**Marketing:**
- Product Updates & Tips - Email only ✅
- Syncs to Resend mailing list

#### Timing Settings

**"Due Soon" Notifications:**
- **Default**: 7 days before due date
- **Contracts**: 3 days before due date
- Set at category level

**"Overdue" Notifications:**
- Triggered on due date
- May send multiple reminders

### Automation

**Notification System:**
- **Cron Jobs** run automatically:
  - Check deadlines every 6 hours
  - Send trial reminders every 12 hours
  - Sync marketing preferences daily

**Event-Based:**
- Client actions (approve, accept, comment)
- Your actions (send invoice, create contract)
- System events (trial ending)

**Deduplication:**
- Uses `event_key` to prevent duplicate notifications
- Won't spam you with same notification

---

## Search

Global search across all your data.

### How to Search

**Search Bar Locations:**
- Dashboard header
- App layout header (most pages)

**Searching:**
1. Click search bar
2. Type your query
3. Press Enter or click search icon
4. Navigates to `/search?q=your+query`

### What's Searchable

**Search looks through:**

**Projects** (searches name):
- Up to 10 results
- Shows project card with client, status, dates

**Clients** (searches name and company):
- Up to 10 results
- Shows client card with status, contact info

**Invoices** (searches invoice number):
- Up to 10 results
- Shows invoice card with client, amount, status

**Tasks** (searches title and description):
- Up to 10 results
- Shows task card with project, priority, status

**Notes** (searches title and content):
- Up to 10 results
- Shows note card with excerpt

**Time Entries** (searches description):
- Up to 10 results
- Shows time entry with project, duration

**Approvals** (searches title):
- Up to 10 results
- Shows approval card with client, status

### Search Results Page (`/search`)

#### Results by Category

Results grouped by type:
- Each category shows up to 10 matches
- Total count shown per category
- Categories appear only if results found

#### Result Cards

**Each Result Shows:**
- Item name/title
- Relevant metadata (client, project, date, etc.)
- Status (if applicable)
- Quick preview/excerpt

**Click Any Result:**
- Navigates to that item
- Clients → Opens client detail sheet
- Projects → Project detail page
- Invoices → Invoice detail
- Tasks → Opens parent project, scrolls to task
- Notes → Opens note in editor
- Time Entries → Time history, filters to entry
- Approvals → Approval detail

#### Empty Results

If no matches found:
- "No results found for '[your query]'"
- Suggestions:
  - Check spelling
  - Try different keywords
  - Use fewer or different words

### Search Tips

**Best Practices:**
- Use specific terms
- Try client names for related items
- Invoice numbers for exact matches
- Project names to find tasks and time
- Partial matches work (searches with `ilike`)

**Current Limitations:**
- Max 10 results per category
- Case-insensitive
- Partial word matching
- Does NOT currently search:
  - Proposals
  - Contracts
  - Services

---

## Feature Requests

Submit ideas and vote on features you'd like to see.

### Feature Request Portal (`/feature-requests`)

**Note**: `/help` redirects here

#### External Help Center

For product documentation and guides:
**Help Center**: `https://get-lance.crisp.help/en/`

#### Feature Request List

**View All Requests:**
- Sorted by vote count (highest first)
- Then by date (newest first)

**Filters:**
- **All** - All feature requests
- **Open** - New requests not yet started
- **In Progress** - Currently being developed
- **Completed** - Released features

#### Request Cards

**Each Card Shows:**
- Title
- Description (if provided)
- Status badge (Open, In Progress, Completed)
- Vote count
- Submission date
- Your vote status (if you voted)

### Submitting a Request

**Click "Submit Request"**

**Form Fields:**
- **Title** (required) - Clear, concise feature name
- **Description** (optional) - Detailed explanation:
  - What feature you want
  - Why it would be helpful
  - How you'd use it
  - Any specific details

**After Submitting:**
- Request appears in list
- Status: Open
- Vote count: 1 (your automatic vote)
- Team reviews regularly

### Voting

**How Voting Works:**
- Click vote button on any request
- Your vote recorded
- Vote count increases
- Click again to remove your vote

**Why Vote:**
- Votes help prioritize development
- Popular requests more likely to be built
- Shows demand for features
- Democratic feature planning

**Your Votes:**
- You can vote on unlimited requests
- See which ones you've voted on
- Change votes anytime

### Request Lifecycle

**Status Progression:**

**Open** (New request):
- Just submitted
- Team reviewing
- Gathering votes

**In Progress** (Being developed):
- Team building this feature
- Active development
- Coming soon

**Completed** (Released):
- Feature is live
- Available in your account
- Request archived

### Admin View

If you're an admin, you have additional access:
- **Admin > Feature Requests** page
- Change request status
- View all votes
- Delete spam/duplicates
- See requestor information

---

## Settings

Configure your account, business, and app preferences.

**Access**: Click user menu (top right) → Settings

**Settings Navigation:**
Sidebar with categories:
- Profile
- Company
- Locale
- Invoices
- Proposals
- Notifications
- Subscription
- Storage

**Dirty State Warning:**
If you have unsaved changes and try to navigate away, you'll see a warning dialog.

---

### Profile Settings (`/settings/profile`)

Manage your personal information and account.

#### Personal Information

**Profile Photo:**
- Click to upload new photo
- **Maximum size**: 500 KB
- Supported formats: Images only
- Displays in:
  - User menu
  - Comments/activities
  - Email signatures (if configured)

**Name:**
- **First Name**
- **Last Name**
- Used for:
  - Dashboard greeting
  - Your party in contracts
  - Email signatures

**Contact:**
- **Email Address** - Your login email
- **Phone Number** - International format supported

#### Account Management

**Delete Account:**
- **Permanent action** - Cannot be undone
- **To delete:**
  1. Click "Delete Account"
  2. Type **DELETE** to confirm
  3. Confirm deletion
- **What happens:**
  - All your data deleted:
    - Clients, projects, tasks
    - Time entries, invoices
    - Proposals, contracts
    - Notes, approvals
    - All files and uploads
  - Subscription cancelled
  - Email sent confirming deletion
  - Cannot be recovered

**Actions:**
- **Save Changes** - Update profile
- **Discard** - Reset unsaved changes

---

### Company Settings (`/settings/business`)

Configure your business information that appears on invoices and contracts.

#### Business Logo

**Company Logo:**
- Click to upload
- **Maximum size**: 1 MB
- Recommended: Square or horizontal
- Appears on:
  - Invoices (PDF)
  - Emails to clients
  - Proposals
  - Contracts
  - Client portal

**Logo Variants:**
- **Secondary Email Logo** - Alternative for dark backgrounds
- **Logo Variant** - Choose "Light" or "Dark" version for emails

#### Business Information

**Core Details:**
- **Business Name** (appears on all client-facing documents)
- **Business Email** (reply-to address for client emails)
- **Business Phone** (appears on invoices/contracts)
- **Website** (optional link)

**Address** (appears on invoices/contracts):
- Street Address
- Street Address 2 (Suite, floor, etc.)
- City
- State/Province
- Postal Code
- Country

**Tax Information:**
- **Tax ID** - Your business tax identification number

#### Email Branding

Customize how your client emails look:

**Brand Color:**
- Color picker
- Default: `#9B63E9` (Lance purple)
- Used in email headers/buttons

**Email Footer:**
- Choose footer style:
  - **Standard** - Default Lance footer
  - **Custom** - Your custom HTML

**Custom Footer HTML:**
If custom selected:
- HTML text area
- Add your:
  - Company info
  - Social links
  - Legal disclaimers
  - Unsubscribe links

#### Setup Warnings

**Invoice Warning:**
If any of these are missing, you'll see a warning when creating invoices:
- Business Name
- Business Email
- Business Address
- (Bank details are separate, below)

**Complete these fields** before sending your first invoice to clients.

**Actions:**
- **Save** - Save all changes
- **Discard** - Reset to last saved state

---

### Locale Settings (`/settings/locale`)

Configure regional preferences for dates, times, numbers, and currency.

#### Quick Setup

**Auto-Detect Button:**
Automatically sets all locale preferences based on:
- Browser language
- Browser timezone
- IP-based location guess

One-click configuration!

#### Currency

**Default Currency:**
- Searchable dropdown
- Full currency list (150+ currencies)
- Used for:
  - New invoices
  - Proposals
  - Contracts
  - Price display

**Currency Display Format:**
- **Symbol** - $ (e.g., $1,234.56)
- **Code** - USD (e.g., USD 1,234.56)
- **Name** - Dollar (e.g., 1,234.56 Dollar)

#### Number Formatting

**Number Format:**
Choose regional format:
- **1,234.56** (US/UK - comma thousands, period decimal)
- **1.234,56** (Europe - period thousands, comma decimal)
- **1 234,56** (France - space thousands, comma decimal)
- **1'234.56** (Switzerland)

Affects display of:
- Prices
- Quantities
- Calculations

#### Date Formatting

**Date Format:**
Choose your preferred format:
- **DD/MM/YYYY** (31/12/2026) - Default, International
- **MM/DD/YYYY** (12/31/2026) - US
- **YYYY-MM-DD** (2026-12-31) - ISO standard
- Other regional variants

Affects display throughout app.

#### Time Formatting

**Time Format:**
- **12-hour** (2:30 PM)
- **24-hour** (14:30)

Affects:
- Timestamps
- Time entry displays
- Notification times

#### Timezone

**Timezone:**
- Searchable dropdown
- All world timezones
- Affects:
  - Due date calculations
  - Notification timing
  - Deadline reminders
  - Timestamp displays

**Important**: Set correctly for accurate due date notifications.

#### Actions

- **Auto-Detect** - One-click setup
- **Save Changes** - Apply preferences
- **Discard** - Reset to last saved

---

### Invoice Settings (`/settings/invoices`)

Configure invoice defaults, numbering, email templates, and taxes.

#### Default Hourly Rate

**Hourly Rate:**
- Your standard hourly rate
- Used when:
  - Logging time (if project has no rate)
  - Creating time-based invoice items
- Can be overridden per:
  - Project
  - Time entry
  - Invoice line item

#### Invoice Numbering

**Automatic invoice number generation:**

**Invoice Prefix:**
- Text before number
- Default: "INV"
- Examples: "INV", "INVOICE", "SI" (Sales Invoice), your initials

**Include Year:**
- Toggle on/off
- When on: INV-2026-00001
- When off: INV-00001

**Starting Number:**
- First invoice number
- Default: 1
- Minimum: 1
- Useful if migrating from another system

**Number Padding:**
- How many digits
- Range: 1-6 digits
- Examples:
  - 1 digit: INV-1
  - 3 digits: INV-001
  - 5 digits: INV-00001

**Reset Yearly:**
- Toggle on/off
- When on: numbering restarts each January 1st
- When off: numbering continues indefinitely

**Example Formats:**
- `INV-2026-00001` (prefix, year, 5 digits)
- `SI-123` (custom prefix, no year, 3 digits)
- `INVOICE-2026-1` (word prefix, year, 1 digit)

**Atomic Numbering:**
Numbers generated using database function with row lock - no duplicates possible.

#### Invoice Content Defaults

**Default Invoice Notes:**
- Text that appears above line items
- Examples:
  - "Thank you for your business!"
  - Project context
  - Payment instructions overview

**Default Invoice Footer:**
- Text that appears below line items
- Examples:
  - "Payment due within 30 days"
  - Late fee policy
  - Thank you message

**Default Bank Details:**
- Payment instructions for clients
- Examples:
  - Bank name and account number
  - Wire transfer instructions
  - Payment portal links
  - Multiple payment methods

**These pre-fill new invoices** but can be edited per invoice.

#### Email Templates

**Default Email Subject:**
Template for invoice emails
- Uses merge tags (see below)
- Example: `Invoice {{invoice_number}} from {{business_name}}`

**Default Email Message:**
Template for invoice email body
- Uses merge tags
- Example:
  ```
  Hi {{client_name}},

  Please find attached invoice {{invoice_number}} for {{project_name}}.
  
  Total: {{total}}
  Due Date: {{due_date}}
  
  Thank you!
  {{business_name}}
  ```

**Available Merge Tags:**
- `{{client_name}}` - Client's full name
- `{{invoice_number}}` - Invoice number
- `{{project_name}}` - Project name (if linked)
- `{{due_date}}` - Formatted due date
- `{{business_name}}` - Your business name
- `{{total}}` - Formatted total amount

**Merge tags automatically replaced** when sending invoice emails.

#### Payment Reminders

**Enable Reminders:**
- Toggle on/off
- Automated reminder emails for unpaid invoices

**Days Before Due:**
- How many days before due date to send
- Example: 3 days = reminder sent 3 days before invoice due

**Reminder Subject:**
Template for reminder emails

**Reminder Body:**
Template for reminder message body

**How It Works:**
1. Cron job checks invoices daily
2. Finds invoices matching criteria:
   - Status: Sent (not paid)
   - Due date = today + reminder days
3. Sends email using reminder templates
4. Reminder sent once (deduplicated)

#### Taxes

Manage your tax presets for invoices.

**Tax List:**
Shows all your tax presets:
- Tax name (e.g., "VAT", "Sales Tax", "GST")
- Tax rate (percentage)
- Default indicator

**Add Tax:**
1. Click "Add Tax"
2. Enter:
   - **Tax Name** (e.g., "VAT 20%")
   - **Tax Rate** (e.g., 20 for 20%)
3. Save

**First Tax:**
Automatically becomes default.

**Set Default Tax:**
- Click "Set as Default" on any tax
- Pre-selected when creating new invoices
- Only one default at a time

**Edit Tax:**
- Click Edit
- Modify name or rate
- Save changes
- **Note**: Changes affect future invoices, not existing ones

**Delete Tax:**
- Click Delete
- Confirm deletion
- **Cannot delete** if used in existing invoices
- Safe: Existing invoices keep their tax settings

**Actions:**
- **Save Changes** - Save all settings
- **Discard** - Reset unsaved changes

---

### Proposal Settings (`/settings/proposals`)

**NEW FEATURE (May 2026)**

Configure defaults for new proposals.

#### Visual Settings

**Default Cover Image:**
- Upload image for proposal covers
- **Maximum size**: 10 MB
- **Recommended dimensions**: 1500×500 pixels
- Appears at top of proposal
- Pre-fills new proposals
- Can be changed per proposal

**Proposal Main Color:**
- Color picker
- Default: `#9b63e9` (Lance purple)
- Used for:
  - Proposal headers
  - Accent colors
  - Button colors in client view

#### Proposal Terms

**Default Validity:**
- Number of days proposal remains valid
- Default: 30 days
- Minimum: 1 day
- Auto-calculates expiry date from send date

**Immediate Availability:**
- Toggle on/off
- Default text for availability requirement
- Example: "Available to start immediately"
- If off, manually specify per proposal

#### Payment Settings

**Payment Structure:**
Choose default structure:
- **Upfront** - Full payment before starting
- **Installments** - Split payments over milestones

**Installment Description:**
If installments selected:
- Default text explaining payment schedule
- Example: "50% upfront, 25% mid-project, 25% on completion"
- Can be edited per proposal

**Payment Methods:**
Multi-select your accepted methods:
- Bank Transfer
- Credit Card
- Debit Card
- PayPal
- Stripe
- Cryptocurrency
- Other (specify custom)

Pre-selected on new proposals, clients see these options.

#### Terms & Conditions

**Default Conditions/Notes:**
- Standard terms for all proposals
- Examples:
  - Revision policy (e.g., "Includes 2 rounds of revisions")
  - Cancellation policy
  - Timeline dependencies
  - What's NOT included
  - Payment terms
  - Intellectual property terms
- Rich text area
- Pre-fills new proposals
- Can be edited per proposal

**Actions:**
- **Upload Cover Image** - Choose default image
- **Remove Cover Image** - Clear default
- **Save Changes** - Apply all settings
- **Discard** - Reset to last saved

---

### Notification Settings (`/settings/notifications`)

Control what notifications you receive and how.

#### Understanding Notification Types

**In-App Notifications:**
- Appear in notification feed
- Badge count in sidebar
- Always available
- Cannot be disabled

**Email Notifications:**
- Sent to your email address
- Optional for most categories
- Can be enabled/disabled per category
- Some categories don't support email

#### Notification Categories

**For Each Category:**
- Toggle for **In-App** (display only, cannot disable)
- Toggle for **Email** (can enable/disable)
- Grouped by feature area

#### Invoice Notifications

**Due Soon:**
- Sent before invoice due date
- Default: 7 days before
- In-App: ✅ Always on
- Email: Toggle ✅ Available

**Overdue:**
- Sent when invoice passes due date
- May send multiple reminders
- In-App: ✅ Always on
- Email: Toggle ✅ Available

#### Approval Notifications

**New Comment:**
- Client added comment to approval
- In-App: ✅ Always on
- Email: Toggle ✅ Available

**Approved/Rejected:**
- Client approved or rejected work
- In-App: ✅ Always on
- Email: Toggle ✅ Available

**Due Soon:**
- Approval request approaching due date
- Default: 7 days before
- In-App: ✅ Always on
- Email: Toggle ✅ Available

**Overdue:**
- Approval request past due date
- In-App: ✅ Always on
- Email: Toggle ✅ Available

#### Proposal Notifications

**Viewed by Client:**
- Client opened proposal link
- Tracks engagement
- In-App: ✅ Always on
- Email: Toggle ✅ Available

**Accepted by Client:**
- Client clicked "Accept Proposal"
- In-App: ✅ Always on
- Email: Toggle ✅ Available

#### Contract Notifications

**You Signed:**
- Confirmation of your signature
- In-App: ✅ Always on
- Email: Toggle ✅ Available

**Client Signed:**
- Client completed signing
- In-App: ✅ Always on
- Email: Toggle ✅ Available

**Fully Signed:**
- Both parties have signed
- Contract now active
- In-App: ✅ Always on
- Email: Toggle ✅ Available

**Cancelled:**
- Contract was cancelled
- In-App: ✅ Always on
- Email: Toggle ✅ Available

**Due Soon:**
- Contract action needed soon
- Default: 3 days before (contracts use shorter window)
- In-App: ✅ Always on
- Email: Toggle ✅ Available

**Overdue:**
- Contract deadline passed
- In-App: ✅ Always on
- Email: Toggle ✅ Available

#### Project & Task Notifications

**Due Soon:**
- Project or task approaching deadline
- Default: 7 days before
- In-App: ✅ Always on
- Email: ❌ Not available (system limitation)

**Overdue:**
- Project or task past deadline
- In-App: ✅ Always on
- Email: ❌ Not available (system limitation)

**Note**: Email notifications for projects and tasks are disabled at the system level.

#### Marketing Notifications

**Product Updates & Tips:**
- Newsletter about Lance features
- Product announcements
- Usage tips and best practices
- Email only: Toggle ✅ Available

**Marketing Sync:**
When you enable/disable this:
- Automatically syncs to Resend mailing list
- Respects your preference
- Can change anytime

#### Timing Settings

**"Due Soon" Default:**
- **7 days** for: Invoices, approvals, projects, tasks
- **3 days** for: Contracts (shorter window intentional)

**"Overdue":**
- Triggered on the due date
- May send periodic reminders
- Timing controlled by system cron jobs

#### How Notifications Work

**Automation:**
- **Cron jobs** run periodically:
  - Check deadlines every 6 hours
  - Send trial reminders every 12 hours
  - Sync marketing preferences daily
- **Event-based**: Instant notifications when:
  - Client takes action (approve, comment, accept)
  - You take action (send invoice, sign contract)
  - System events occur (trial ending)

**Deduplication:**
- Each notification has unique `event_key`
- Prevents duplicate notifications
- Won't spam you with same notification multiple times

**Actions:**
- **Save Changes** - Apply preferences
- Automatically syncs to Resend for marketing updates

---

### Subscription & Billing (`/settings/subscription`)

Manage your Lance subscription and billing.

#### Current Plan

**Plan Information Displayed:**
- Plan name: Early Access Monthly or Early Access Annual
- Status badge: Free Trial, Active, Past Due, or Inactive
- Current period (start and end dates)
- Renewal date

**Status Meanings:**

**Free Trial:**
- Within your 15-day trial period
- Shows days remaining
- Trial end date displayed
- "You won't be charged until your trial ends"
- Full access to all features

**Active:**
- Paid subscription active
- Full feature access
- Billing date shown

**Past Due:**
- Payment failed
- Access may be restricted
- Update payment method required

**Inactive:**
- No active subscription
- Trial expired or cancelled
- Limited to this settings page only
- Must reactivate for access

#### Trial Information

**During Trial:**
- Days left displayed prominently
- Trial end date
- What happens when trial ends:
  - Automatic charge to payment method
  - Continues as paid subscription
  - Cancel before trial ends to avoid charge

**Trial Reminders:**
You'll receive email reminders:
- 5 days before trial ends
- 1 day before trial ends
- Day trial ends

#### Plan Options

**Early Access Monthly**
- **$29 per month**
- Billed monthly
- 15-day free trial for new subscriptions
- Cancel anytime

**Early Access Annual**
- **$290 per year**
- Billed annually
- **Save 2 months** compared to monthly ($348 vs $290)
- 15-day free trial for new subscriptions
- Better value

**All Plans Include:**
- Unlimited clients
- Unlimited projects
- Unlimited tasks
- Time tracking (timer + logs)
- Invoicing with PDF generation
- Proposals (Beta)
- Contracts (Beta, access may vary)
- Services catalog
- Client approvals
- Notes workspace
- Notifications
- Dashboard analytics
- 200 MB file storage
- Email support

#### Managing Your Subscription

**Manage Subscription Button:**
Opens **Stripe Customer Portal** (secure) where you can:

**Update Payment Method:**
- Add new credit/debit card
- Update billing address
- Change payment method

**View Invoices:**
- Download past invoices
- View payment history
- Receipt for tax purposes

**Change Plan:**
- Switch Monthly ↔ Annual
- Prorated billing applied
- Immediate access to new plan

**Cancel Subscription:**
- Cancel renewal
- Access until current period ends
- No refunds for partial periods
- Can reactivate before period ends

#### Upgrading or Switching Plans

**During Trial:**
- Click **Upgrade** on desired plan
- Takes you to Stripe Checkout
- If switching plan type during trial:
  - Trial continues
  - Charged at trial end for selected plan

**Active Subscription:**
- Click **Change Plan**
- Goes to Stripe Customer Portal
- Prorated billing:
  - Switching to annual: Credit for remaining monthly time
  - Switching to monthly: No proration (annual benefits until renewal)

#### Billing

**Payment Method:**
Managed through Stripe Customer Portal:
- Credit cards
- Debit cards
- Other Stripe-supported methods

**Billing Cycle:**
- Monthly: Same day each month
- Annual: Same day each year

**Failed Payments:**
- Status changes to "Past Due"
- Email notification sent
- Access may be restricted
- Update payment method in Customer Portal

#### Cancellation

**To Cancel:**
1. Click **Manage Subscription**
2. In Stripe Portal, click **Cancel subscription**
3. Confirm cancellation
4. Choose reason (optional feedback)

**After Cancellation:**
- Access continues until end of current period
- No future charges
- All data preserved during period
- After period ends:
  - Redirected to subscription page
  - Cannot access app features
  - Data preserved (can reactivate)

**Reactivation:**
If you cancelled but period hasn't ended:
- Can reactivate in Stripe Portal
- Billing resumes normally

**After Period Ends:**
- Click plans to start new subscription
- Immediate access upon payment
- All data intact

#### Data Retention

**Active or Cancelled:**
- All data preserved indefinitely
- Even after cancellation
- Safe to take a break

**To Delete Data:**
Must explicitly delete account in Profile Settings.

**No Hidden Fees:**
- No setup fees
- No cancellation fees
- Only plan price

---

### Storage Settings (`/settings/storage`)

Monitor and manage your file storage usage.

#### Storage Limit

**Total Storage:**
- **200 MB per user**
- Applies to your entire account
- Shared across all file types

#### What Counts Toward Storage

**File Types That Use Storage:**
- **Proposal cover images** - Uploaded in proposal settings or proposal detail
- **Client logos** - Uploaded in client detail
- **Business logos** - Uploaded in company settings
- **Profile photos** - Uploaded in profile settings
- **Review/approval files** - Uploaded in approval requests
- **Note images** - Embedded in note editor
- **Other uploaded assets**

#### Storage Usage Display

**Usage Bar:**
- Visual progress bar
- Shows used vs available space
- Color coding:
  - Green: Under 70%
  - Yellow: 70-90%
  - Red: Over 90%

**Usage Statistics:**
- **Used**: XX.X MB
- **Available**: XX.X MB
- **Percentage**: XX%

**Updated in Real-Time:**
Recalculates when you:
- Upload files
- Delete files
- Complete storage actions

#### File Management

**File List:**
Shows all files using storage, organized by type:

**For Each File:**
- Filename
- File size (KB or MB)
- Upload date
- Associated item (e.g., which proposal, client, approval)
- **Delete** button

**Sections:**
- **Branding Assets** - Business logos, admin branding
- **Proposals** - Cover images
- **Clients** - Client logos
- **Profile** - Your profile photo
- **Review Files** - Approval attachments (largest section typically)

#### Deleting Files

**To Free Up Space:**
1. Click **Delete** next to any file
2. Confirm deletion
3. File removed from storage immediately
4. Storage usage updates

**⚠️ Important Warnings:**

**Approval Files:**
- Deleting a review file removes it from the approval request
- If you delete the **last file** in an approval request:
  - **Entire approval request is deleted**
  - All comments lost
  - Cannot be undone

**Logo Files:**
- Deleting business logo removes it from invoices, proposals, contracts
- Deleting client logo removes it from that client's profile
- Can upload new one anytime

**Profile Photo:**
- Deleting removes from your profile
- Reverts to default avatar
- Can upload new one anytime

#### Storage Full

**At 100% Capacity:**
- **Cannot upload new files** until you free space
- Error message when attempting uploads
- Must delete existing files to continue

**To Free Space:**
1. Review file list
2. Delete old/unused files:
   - Completed approval request files
   - Old proposal covers
   - Unused logos
3. Large files provide most benefit

#### Storage Tips

**Optimize Your Storage:**
- **Compress images** before uploading (use tools like TinyPNG)
- **Delete completed approval files** after client approves
- **Use external hosting** for very large files (link instead of upload)
- **Clean up test files** from early use
- **Review regularly** to stay under limit

**File Size Guidelines:**
- Profile photo: Max 500 KB (enforced)
- Business logo: Max 1 MB (enforced)
- Proposal cover: Max 10 MB (enforced)
- Other files: Limited by total storage

**Storage is Generous:**
200 MB typical usage:
- ~20 proposal covers (10 MB each)
- ~200 approval images (1 MB each)
- ~400 small documents (500 KB each)

Most users don't reach the limit with normal use.

---

## Admin Features

**Access Requirement:** `is_admin` flag on your profile

**Access Gate:**
Non-admin users attempting to access `/admin/*` are redirected to Dashboard.

### Admin Navigation

**Admin Sidebar** (separate from main app navigation):
- Overview
- Landing Content
- Announcements
- Comms & Templates
- Branding
- Icons
- Help Content
- Feature Requests
- Feedback

**Hidden Route** (not in sidebar but accessible):
- System Check (`/admin/system-check`)

---

### Admin Overview (`/admin/overview`)

**Dashboard for administrators** with links to all admin sections:

**Cards for:**
- Landing Content - Edit marketing website
- Announcements - Broadcast to users
- Comms & Templates - Email template management
- Branding - App logo and colors
- Icons - Custom icon system
- Help Content - Help article CMS
- Feature Requests - Moderate user requests
- Feedback - View user feedback
- System Check - Health monitoring

Click any card to navigate to that admin section.

---

### Landing Content (`/admin/landing-content`)

**Marketing website content management system (CMS).**

**Edit Landing Page Sections:**

**Hero Section:**
- Headline
- Subheadline
- Call-to-action button text
- Hero image

**Features Section:**
- Feature list items
- Feature descriptions
- Feature icons

**Pricing Section:**
- Plan names
- Plan prices
- Plan features
- Trial copy

**Trial Banner:**
- Trial duration text
- Trial benefits

**Social Proof:**
- Testimonials
- Customer logos
- Statistics

**Footer:**
- Footer links
- Company information
- Social media links

**Format:**
Large JSON-based editor or form fields (implementation varies).

**Actions:**
- **Save Changes** - Publish to landing page
- **Preview** - See changes before saving
- **Discard** - Reset unsaved changes

**Note:** Changes affect public-facing landing page at `/`.

---

### Announcements (`/admin/announcements`)

**Broadcast in-app announcements to all users.**

#### Announcement List

Shows all announcements:
- Title
- Created date
- Status (draft, sent)
- Recipient count

#### Creating an Announcement

**Fields:**
- **Title** - Announcement headline
- **Message** - Full message body
  - Supports markdown or rich text
  - Can include:
    - Formatted text
    - Links
    - Lists
- **Type** - Category (info, feature, maintenance, urgent)
- **Target** - Who sees it:
  - All users
  - Active subscribers only
  - Trial users only
  - Admins only

**Actions:**
- **Save as Draft** - Save without sending
- **Send Now** - Broadcast immediately
- **Schedule** - Send at future date/time (if feature exists)

#### How Announcements Work

**Delivery:**
- Creates notification for each targeted user
- Appears in user notification feed
- Badge count increases for unread
- May also send email (depending on settings)

**User Experience:**
- User sees notification
- Clicks to read full announcement
- Can dismiss or mark read

#### Managing Announcements

**Edit Draft:**
Modify unsaved announcements

**View Sent:**
See past announcements, cannot edit

**Delete:**
Remove draft announcements

---

### Comms & Templates (`/admin/comms`)

**Manage system email templates and communication defaults.**

#### Email Templates

**Invoice Emails:**
- Default subject line
- Default message body
- Merge tag variables

**Reminder Emails:**
- Subject and body for payment reminders
- Due date variables

**Approval Emails:**
- Review request notification
- Comment notification
- Approval/rejection notification

**Proposal Emails:**
- Proposal sent notification
- Proposal viewed notification
- Proposal accepted notification

**Contract Emails:**
- Contract sent notification
- OTP code email
- Signature confirmation
- Fully signed confirmation

**Trial Reminder Emails:**
- **5 Days Before** template
- **1 Day Before** template
- **Trial Ends Today** template

**Each Template Includes:**
- Subject line
- Email body (HTML supported)
- Available merge tags listed
- Preview button

#### Email Header/Footer

**Global Email Branding:**
- Header HTML - Top of all emails
- Footer HTML - Bottom of all emails
- Applies to all automated emails

**Example Uses:**
- Company logo in header
- Social links in footer
- Unsubscribe links
- Legal disclaimers
- Brand colors and styling

#### System Defaults

**Default Copy:**
If users haven't customized their settings, these defaults are used:
- Invoice notes
- Invoice footer
- Bank details template
- Email signatures

**Updating Defaults:**
- Edit template text
- Save changes
- Users who haven't customized inherit these
- Users who have customized are unaffected

#### Actions

- **Save All Changes** - Update all templates
- **Reset to System Defaults** - Restore original templates
- **Preview Email** - See rendered email
- **Send Test Email** - Send to your email address

---

### Branding (`/admin/branding`)

**Manage app-wide branding elements.**

#### App Logo

**Primary Logo:**
- Main app logo
- Shows in:
  - Login page
  - Dashboard header
  - App sidebar
  - Loading screens

**Upload:**
- Click to upload
- Recommended: SVG or PNG
- Transparent background preferred

**Logo Icon:**
- Favicon/shortcut icon
- Shows in browser tabs
- Recommended: Square, 512×512px

#### App Colors

**Primary Color:**
- Main brand color
- Used throughout app for:
  - Buttons
  - Links
  - Active states
  - Accents

**Secondary Color:**
- Supporting color
- Used for:
  - Secondary actions
  - Backgrounds
  - Hover states

**Color Picker:**
- Visual color picker
- Or enter hex code
- Live preview

#### Logo Sizing

**Size Controls:**
- Logo height in app
- Logo height on landing page
- Scale factor

**Preview:**
Shows how logo appears at different sizes.

#### Actions

- **Save Branding** - Apply changes app-wide
- **Reset to Defaults** - Restore Lance default branding
- **Preview** - See changes before saving

**Note:** Changes affect entire application for all users.

---

### Icons (`/admin/icons`)

**Manage custom icon system for UI customization.**

#### Icon Slot System

**What Are Icon Slots?**
Slots are specific locations in the UI that use icons:
- Sidebar menu items
- Empty state illustrations
- Action buttons
- Feature cards
- Dashboard sections

**Each Slot:**
- Has a unique key (e.g., "sidebar-clients", "empty-projects")
- Uses default Lucide icon
- Can be customized with uploaded icon

#### Icon Slot List

**For Each Slot:**
- Slot name (human-readable)
- Slot key (technical identifier)
- Current icon (preview)
- Default icon (preview)
- **Customize** button

#### Customizing Icons

**To Customize a Slot:**
1. Click **Customize** on desired slot
2. Choose option:
   - **Upload Custom Icon** - SVG or PNG
   - **Select from Uploads** - Previously uploaded icons
   - **Reset to Default** - Use original Lucide icon

**Upload Requirements:**
- SVG preferred (scales perfectly)
- PNG with transparency
- Square recommended
- Max file size: (check implementation)

**After Upload:**
- Icon stored in `app-icons` bucket
- Linked to slot
- Immediately visible in app

#### Uploaded Icons Library

**View All Uploads:**
List of all icons you've uploaded:
- Icon preview
- Icon name
- Upload date
- Used in which slots
- **Delete** option

**Reuse Icons:**
- Upload once
- Assign to multiple slots
- Consistent icon set

#### Use Cases

**Custom Branding:**
- Replace Lance default icons with your brand icons
- Consistent visual identity
- White-label appearance

**Icon Customization Examples:**
- Sidebar: Custom icons for Clients, Projects, Time, etc.
- Empty states: Brand-appropriate illustrations
- Dashboard: Feature-specific icons

#### Actions

- **Upload New Icon** - Add to library
- **Assign to Slot** - Link icon to UI location
- **Remove Assignment** - Revert to default
- **Delete Icon** - Remove from library (if not in use)

**Note:** Icon changes are instant and affect all users.

---

### Help Content (`/admin/help-content`)

**Manage help center articles for users.**

#### Article List

Shows all help articles:
- Title
- Category
- Published status
- Order/position
- Edit/delete actions

**Categories:**
- Getting Started
- Features
- Billing
- Account
- Troubleshooting
- FAQ
- (Custom categories)

#### Creating an Article

**Fields:**
- **Title** - Article headline
- **Slug** - URL-friendly identifier (e.g., "getting-started")
- **Category** - Group articles
- **Content** - Article body
  - Rich text editor
  - Markdown supported
  - Can include:
    - Headings
    - Lists
    - Code blocks
    - Images
    - Links
    - Videos
- **Order Position** - Number for sorting within category
- **Published** - Toggle visibility

#### Content Editor

**Rich Text Features:**
- Formatting (bold, italic, etc.)
- Headings (H1-H6)
- Lists (bulleted, numbered)
- Links (internal and external)
- Images (upload or URL)
- Code blocks (for technical articles)
- Tables
- Quotes

#### Article Management

**Edit Article:**
- Click article in list
- Modify any field
- Save changes
- Live updates to help center

**Reorder Articles:**
- Change order position number
- Within same category
- Lower numbers appear first

**Delete Article:**
- Remove article
- Confirm deletion
- Removed from help center immediately

**Publish/Unpublish:**
- Toggle published status
- Unpublished articles invisible to users
- Can draft before publishing

#### Help Center Integration

**User Access:**
- External help center: `https://get-lance.crisp.help/en/`
- May also have internal help within app (check implementation)

**Article URL Format:**
- `/help/[category]/[slug]`
- Example: `/help/getting-started/creating-first-project`

#### Actions

- **New Article** - Create help content
- **Edit** - Modify existing
- **Reorder** - Change sort order
- **Delete** - Remove article
- **Preview** - See as users see it

---

### Feature Requests (`/admin/feature-requests`)

**Moderate and manage user-submitted feature requests.**

#### Request List

**View All Requests:**
- Title
- Description
- Submitter (user)
- Status
- Vote count
- Submission date

**Sorting:**
- By votes (most popular first)
- By date (newest first)
- By status

#### Status Management

**Change Request Status:**
- **Open** - New request, under consideration
- **In Progress** - Actively being developed
- **Completed** - Feature released

**Status Change:**
1. Click request
2. Select new status from dropdown
3. Save
4. Users see updated status
5. Requestor may receive notification

#### Viewing Details

**For Each Request:**
- Full description
- User who submitted
- All votes (count and usernames)
- Submission date
- Comments (if feature exists)

#### Request Actions

**Edit Request:**
- Modify title or description
- Clarify or consolidate similar requests

**Delete Request:**
- Remove spam or duplicates
- Confirm deletion
- Vote data lost

**Merge Requests:**
(If feature exists)
- Combine duplicate requests
- Transfer votes to primary request

#### Voting Information

**See Who Voted:**
- List of users who voted
- Email addresses
- Vote dates

**Vote Analytics:**
- Total vote count per request
- Vote trends over time
- Popular feature areas

#### Use Cases

**Prioritization:**
- High-vote requests = high demand
- Use for product roadmap planning

**Communication:**
- Update status as features progress
- Show users you're listening
- Transparent development process

**Feedback Loop:**
- Understand user needs
- Identify patterns in requests
- Inform feature development

#### Actions

- **View Request Details** - See full information
- **Change Status** - Update development status
- **Delete Request** - Remove spam/duplicates
- **Export List** - Download all requests (CSV)

---

### Feedback (`/admin/feedback`)

**View and manage user feedback submissions.**

#### Feedback List

**All User Feedback:**
- Feedback type (bug, feature, general)
- Feedback content
- User who submitted
- Submission date
- Status (new, reviewing, resolved)

#### Feedback Types

**Categories:**
- **Bug Report** - Something broken
- **Feature Request** - New functionality idea
- **General Feedback** - Comments, praise, concerns
- **Other** - Uncategorized

#### Viewing Feedback

**For Each Submission:**
- Full feedback text
- User information:
  - Name
  - Email
  - User ID
- Submission timestamp
- Browser/device info (if captured)
- Current page when submitted (if captured)

#### Feedback Actions

**Mark as Reviewed:**
- Acknowledge you've seen it
- Track what's been addressed

**Mark as Resolved:**
- Issue fixed or addressed
- Feedback acted upon

**Respond to User:**
(If feature exists)
- Send direct reply
- Thank user or ask for clarification

**Delete Feedback:**
- Remove spam
- Clean up test submissions

#### Feedback Analytics

**Dashboard/Stats:**
(If implemented)
- Total feedback count
- By type breakdown
- Unresolved count
- Recent trends

#### Use Cases

**Bug Tracking:**
- User-reported bugs
- Prioritize fixes
- Track issue patterns

**Product Insights:**
- User sentiment
- Feature requests
- UX pain points

**Customer Care:**
- Respond to concerns
- Build relationships
- Improve satisfaction

#### Actions

- **View Feedback** - Read full submission
- **Change Status** - Mark reviewed/resolved
- **Delete** - Remove spam
- **Export** - Download all feedback (CSV)

---

### System Check (`/admin/system-check`)

**System health monitoring and testing tools.**

**Note:** This page is routed but NOT in the admin sidebar. Access via URL: `/admin/system-check`

#### Email Testing

**Send Test Emails:**
Test email delivery and templates.

**Trial Reminder Test:**
1. Enter email address
2. Select reminder type:
   - 5 days before
   - 1 day before
   - Trial ends today
3. Click **Send Test**
4. Check email inbox
5. Verify formatting, content, links

**Account Deletion Confirmation Test:**
1. Enter email address
2. Click **Send Test**
3. Verify deletion email template

**Purpose:**
- Ensure email system working
- Preview email templates
- Test before real users receive

#### Billing Health Check

**Run Billing Diagnostics:**

Click **Run Billing Health Check** to:
- Query Stripe for subscription statuses
- Compare with database records
- Identify mismatches
- Check for:
  - Orphaned subscriptions
  - Missing customer IDs
  - Status sync issues
  - Payment failures

**Results Display:**
- ✅ All systems healthy
- ⚠️ Warnings found (list issues)
- ❌ Critical issues (list problems)

**Common Issues Found:**
- Stripe subscription active but DB shows inactive
- Customer ID missing
- Webhook not received
- Payment method expired

**Actions:**
- View detailed report
- Sync button (if auto-sync available)
- Export report

#### Manual Launch Checklist

**Pre-Launch Testing Checklist:**
Text-based checklist of manual tests:

- [ ] **Send real review approval**
  - Create approval request
  - Send to test email
  - Verify public page loads
  - Test approve/reject
  - Verify notifications

- [ ] **Send real invoice email**
  - Create test invoice
  - Send to test email
  - Verify PDF attachment
  - Check formatting
  - Test invoice link

- [ ] **Test password reset**
  - Request password reset
  - Check email delivery
  - Follow reset link
  - Change password
  - Verify login works

**Purpose:**
Ensure critical user flows work before launch or after major updates.

#### System Statistics

**Overview Metrics:**
(If implemented)
- Total users
- Active subscriptions
- Trial conversions
- System uptime
- Database size
- Storage usage across all users

#### Actions

- **Send Test Email** - Test email delivery
- **Run Billing Health Check** - Check Stripe sync
- **Export Diagnostics** - Download system report
- **Refresh Stats** - Update metrics

---

## Client Portal

**NEW FEATURE (May 2026)**

Secure, token-based portal for clients to access their information without creating an account.

### What Is the Client Portal?

**Purpose:**
Give clients self-service access to:
- Their invoices
- Proposals sent to them
- Contracts for signing
- Approval requests
- Time tracking (optional)

**No Login Required:**
- Token-based authentication
- Unique URL per client
- Secure access without passwords

### Enabling the Portal

**From Client Detail:**

1. Open any client
2. Scroll to **Portal Settings** section
3. Toggle **Enable Portal**
4. Choose **Visible Sections**:
   - ☑ Details - Client contact info
   - ☑ Invoices - All invoices for this client
   - ☑ Proposals - Sent proposals
   - ☑ Contracts - Active contracts
   - ☑ Approvals - Approval requests
   - ☐ Time - Time tracking (optional)
     - If enabled, choose visibility:
       - Billable time only
       - Non-billable time only
       - Both

5. **Save**

**Portal Token:**
Unique token automatically generated for this client.

### Sending Portal Access

**Two Methods:**

**1. Send Portal Link (Email):**
- Click **Send Portal Link** in client detail
- Client receives email with:
  - Portal URL
  - Instructions
  - What they can access

**2. Copy Portal URL:**
- Click **Copy Portal URL**
- Share URL manually:
  - Text message
  - Slack
  - Other communication channel

**Portal URL Format:**
`https://yourdomain.com/portal/{unique-token}`

### Client Portal Experience

Client clicks portal link and lands on: `/portal/:token`

#### Portal Home

**Client Sees:**

**Header:**
- Your business logo
- Client name
- Last updated date

**Navigation Tabs:**
Only enabled sections visible:
- Details
- Invoices
- Proposals
- Contracts
- Approvals
- Time (if enabled)

#### Details Tab

**Client Information:**
- Name and company
- Email and phone
- Address
- Contact information

**Read-Only:**
Client cannot edit (except in contract signing flow).

#### Invoices Tab

**Invoice List:**
- All invoices for this client
- Status badges (Sent, Paid, Overdue)
- Invoice number
- Issue date
- Due date
- Total amount

**Click Invoice:**
- Opens invoice detail in portal
- URL: `/portal/:token/invoice/:invoiceId`
- **Full Invoice View:**
  - All line items
  - Subtotal, tax, total
  - Notes and footer
  - Bank details for payment
  - **Download PDF** button

**What Client Can Do:**
- View all invoices
- Download invoice PDFs
- See payment status
- View payment instructions

**What Client Cannot Do:**
- Edit invoices
- Mark as paid (you do this)
- Delete invoices

#### Proposals Tab

**Proposal List:**
- All proposals sent to this client
- Status (Sent, Read, Accepted)
- Title
- Total amount
- Sent date
- Validity/expiry

**Click Proposal:**
- Opens full proposal view
- Same as public proposal page
- Can accept if not yet accepted

#### Contracts Tab

**Contract List:**
- All contracts with this client
- Status (Pending Signatures, Signed)
- Contract number
- Total amount
- Created date

**Click Contract:**
- Opens contract view
- If pending signature:
  - Can sign with OTP
  - Update details before signing
- If fully signed:
  - Read-only view
  - Download PDF

#### Approvals Tab

**Approval Request List:**
- All approval requests for this client
- Status (Pending, Approved, Rejected)
- Title
- Version
- Due date (if set)

**Click Approval:**
- Opens public approval page
- View files
- Leave comments
- Approve or reject
- Upload files (if allowed)

#### Time Tab

(Only visible if enabled in portal settings)

**Time Entry List:**
- Entries logged for this client's projects
- Filtered by visibility setting:
  - Billable only
  - Non-billable only
  - Both

**For Each Entry:**
- Date
- Description
- Project name
- Task name (if applicable)
- Duration
- Billable status (if showing both types)

**What Client Can Do:**
- View time logged
- See project progress
- Track hours against estimates

**What Client Cannot Do:**
- Edit time entries
- Add time entries
- Delete time

### Security

**Token-Based Access:**
- Each client has unique token
- Token must be kept secure
- Like a private link

**Token Management:**
- Token generated automatically
- Cannot be customized (prevents guessing)
- Regenerate if compromised (future feature)

**Data Isolation:**
- Client only sees their own data
- Cannot access other clients
- Cannot see your internal data
- No admin access

**No User Account:**
- Client doesn't create account
- No password to remember
- Access via link only

### Portal Management

**Disable Portal:**
1. Open client detail
2. Toggle **Enable Portal** off
3. Save
4. Portal link immediately stops working
5. Client sees "Portal not found" if attempting access

**Update Visible Sections:**
1. Open client detail
2. Change section checkboxes
3. Save
4. Client sees updated sections immediately

**Resend Portal Link:**
- Click **Send Portal Link** again
- Client receives fresh email
- Same token (link doesn't change)

### Use Cases

**Reduce Email Volume:**
- Clients check their own invoices
- No need to re-send invoice PDFs
- Self-service proposal viewing

**Professional Client Experience:**
- Branded portal
- Easy access
- Mobile-friendly
- No account creation friction

**Transparency:**
- Clients see project progress (time tracking)
- Status of all proposals
- Contract history
- Payment history

**Efficiency:**
- Clients approve directly
- Sign contracts in portal
- View time tracking themselves

---

## Common Workflows

### Complete Freelance Project Workflow

**From lead to payment:**

1. **Add Lead**
   - Add client in CRM board
   - Status: "New Lead"
   - Add contact info, lead source
   - Set next follow-up date

2. **Nurture Lead**
   - Log activities (calls, emails, meetings)
   - Move through CRM stages
   - Update follow-up tasks
   - Create follow-up reminders

3. **Send Proposal**
   - Create proposal from accepted lead
   - Select services from catalog
   - Set timeline and payment terms
   - Send to client
   - Client accepts

4. **Create Contract** (Optional)
   - Import from accepted proposal
   - Both parties sign
   - Contract becomes active

5. **Create Project**
   - Link to client
   - Set budget and rates from proposal
   - Add start and due dates
   - Create task columns

6. **Plan Work**
   - Add tasks to project
   - Set priorities and due dates
   - Organize in Kanban board

7. **Track Time**
   - Use timer while working
   - Or log time manually
   - Link to specific tasks
   - Mark as billable

8. **Get Approvals**
   - Create approval request
   - Upload design files
   - Client reviews and approves

9. **Create Invoice**
   - Select client and project
   - Import unbilled time entries
   - Add tax
   - Review and send

10. **Client Pays**
    - Client receives email
    - Views invoice in portal
    - Makes payment
    - You mark invoice as paid

11. **Archive & Follow-Up**
    - Mark project as complete
    - Archive client (if relationship ending)
    - Or set follow-up for future work

### Proposal to Contract Workflow

**Streamlined proposal-to-contract flow:**

1. **Create Services**
   - Build service catalog
   - Set standard pricing
   - Define deliverables

2. **Configure Proposal Defaults**
   - Settings > Proposals
   - Set cover image
   - Default payment terms
   - Standard conditions

3. **Create Proposal**
   - Select client
   - Add services from catalog
   - Customize for this project
   - Set timeline and validity

4. **Send to Client**
   - Email proposal link
   - Client views at leisure
   - You receive notification when viewed

5. **Client Accepts**
   - Client clicks "Accept Proposal"
   - Status changes to "Accepted"
   - You receive notification

6. **Create Contract**
   - Click "Create Contract from Proposal"
   - Client info auto-fills
   - Services import automatically
   - Choose contract template

7. **Customize Contract**
   - Add specific terms
   - Set payment schedule
   - Review all fields

8. **Sign & Send**
   - You sign first
   - Status: "Pending Signatures"
   - Send to client
   - Contract fields lock

9. **Client Signs**
   - Client receives email
   - Opens contract link
   - Requests OTP code
   - Verifies and signs

10. **Both Signed**
    - Status: "Signed"
    - Both parties notified
    - Download final PDF
    - Begin project

### Client Approval Workflow

**Design/creative approval process:**

1. **Prepare Files**
   - Export designs
   - Prepare mockups
   - Generate PDFs or images

2. **Create Approval Request**
   - Title and description
   - Select client
   - Link to project
   - Upload files
   - Set due date

3. **Add Recipients**
   - Client email (auto-added)
   - Stakeholders
   - Decision-makers

4. **Send for Review**
   - Click "Send to Client"
   - Or copy link to share manually
   - Email notification sent

5. **Client Reviews**
   - Opens public link (no login)
   - Views all files
   - Zooms and inspects

6. **Client Provides Feedback**
   - Two options:
     - **Approve** - All looks good
     - **Comment** - Request changes

7. **If Comments:**
   - Review client feedback
   - Make revisions
   - Upload new version
   - Update version number
   - Send reminder

8. **Client Approves**
   - Final approval
   - Status: "Approved"
   - You receive notification

9. **Create Invoice** (Optional)
   - Click "Create Invoice" from approval
   - Client/project pre-filled
   - Bill for work

10. **Complete & Archive**
    - Project milestone complete
    - Delete files if needed (frees storage)
    - Move to next phase

### Retainer Client Setup

**Ongoing monthly client:**

1. **Add Client**
   - Status: "Active"
   - Enable client portal
   - Send portal link

2. **Create Service**
   - Service catalog
   - Monthly retainer service
   - Set recurring: Monthly
   - Define included hours

3. **Create Contract**
   - Retainer terms
   - Monthly hours included
   - Overage rate
   - Renewal terms
   - Both sign

4. **Create Monthly Project**
   - Month-by-month project
   - Or single ongoing project

5. **Track Time**
   - Log all time to project
   - Mark as billable
   - Tag tasks appropriately

6. **Monthly Invoicing**
   - End of month:
   - Create invoice
   - Import time (up to retainer hours)
   - Add fixed retainer amount
   - Add overage if applicable
   - Send invoice

7. **Client Portal Access**
   - Client views invoices
   - Checks time tracking
   - Downloads past invoices
   - Self-service access

8. **Recurring Process**
   - Repeat monthly
   - Track against retainer
   - Regular check-ins
   - Follow-ups as needed

---

## Limits & Constraints

### Storage Limits

| Item | Limit |
|------|-------|
| **Total Storage** | 200 MB per user |
| **Profile Photo** | 500 KB max |
| **Business Logo** | 1 MB max |
| **Proposal Cover** | 10 MB max |

### Subscription & Billing

| Item | Details |
|------|---------|
| **Free Trial** | 15 days |
| **Monthly Plan** | $29/month |
| **Annual Plan** | $290/year (2 months free vs monthly) |
| **After Trial** | App access blocked except subscription page |
| **Payment Methods** | Via Stripe (credit/debit cards, etc.) |

### Feature Limits

| Feature | Limit/Note |
|---------|------------|
| **Contracts Access** | May be admin-only depending on configuration |
| **Team Workspaces** | Not available (single user per account) |
| **Search Results** | 10 per category max |
| **Time Entry List** | 200 most recent displayed |

### Technical Constraints

| Item | Constraint |
|------|------------|
| **Password** | Minimum 6 characters |
| **Invoice Number Padding** | 1-6 digits |
| **Invoice Start Number** | Minimum 1 |
| **Proposal Validity** | Minimum 1 day |
| **Service Price** | Must be > 0 if provided |
| **Contract OTP** | Expires after 15 minutes |
| **Follow-Up Title** | Required, minimum 1 character |

### Deletion Constraints

| Item | Rule |
|------|------|
| **Client Hard Delete** | Blocked if client has invoices, projects, proposals, contracts, or time entries - use Archive instead |
| **Last Approval File** | Deleting last file in approval request deletes entire request |
| **Contract Template** | Cannot delete if used in existing contracts |
| **Tax** | Cannot delete if used in existing invoices |

### File Upload Limits

| File Type | Limit |
|-----------|-------|
| Profile Photo | 500 KB, images only |
| Business Logo | 1 MB, images only |
| Proposal Cover | 10 MB, images recommended |
| Review Files | Limited by total storage (200 MB) |

### System Behavior

| Behavior | Details |
|----------|---------|
| **Invoice Lock** | Sent/paid invoices read-only until "Edit" clicked |
| **Contract Lock** | After sending, core fields immutable (database trigger) |
| **Auto-Save Notes** | After 800ms inactivity |
| **OTP Expiration** | Contract signing OTP expires in 15 minutes |
| **Portal Token** | Cannot be customized (security) |

### What's Not Available

| Feature | Status |
|---------|--------|
| **Team Collaboration** | Not available - single user per account |
| **Multi-User Workspaces** | Coming soon message in onboarding |
| **Assignees on Tasks** | Tasks owned by logged-in user only |
| **Real-time Collaboration** | Notes, tasks, etc. are single-user |
| **Mobile Apps** | Web-only (responsive design) |

---

## Getting Help

### In-App Help

**Feature Requests:**
- Submit ideas via `/feature-requests`
- Vote on other requests
- Track feature status

**Feedback Tab:**
- Floating widget
- Submit bugs or feedback
- Quick and easy

### External Help

**Crisp Help Center:**
`https://get-lance.crisp.help/en/`

- Full documentation
- Getting started guides
- Feature tutorials
- FAQ

**Crisp Chat Widget:**
- Click chat bubble (if enabled)
- Live support
- Ask questions in real-time

### Admin Help

If you're having technical issues:
- Check **Admin > System Check** (admins only)
- Run billing health check
- Test email delivery
- Review system status

---

**End of User Guide**
