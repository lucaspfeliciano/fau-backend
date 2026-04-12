# 🚀 Product Flow & User Experience – CS x Product x Engineering Platform

## 🧠 Core Goal

This platform must solve a critical problem:

> Customer Success and Sales teams do not know what is happening with customer requests.

The system must provide:
- clarity
- visibility
- predictability
- automation

---

## 🎯 Primary User

### 👤 Fau (Customer Success / Sales)

Fau is not technical.

He needs to:
- quickly register customer requests
- understand if something is already being worked on
- know the current status
- know when it will be delivered
- avoid asking Product or Engineering for updates

---

## 💥 Core Promise of the Product

At any moment, Fau should be able to answer:

- What are customers asking for?
- Are we working on it?
- What is the current status?
- When will it be delivered?

Without asking anyone.

---

# 🔁 Core System Flow (End-to-End)

## 1. 📥 Input (Request Creation)

Fau creates or imports a request.

### Ways to create:
- Manual form
- Paste meeting notes
- Slack message (future)

---

### System behavior:

- Suggest similar existing requests (deduplication)
- Allow linking to:
  - Customer
  - Company
- If duplicate exists:
  → increase votes instead of creating new

---

## 2. 🧠 Organization (Request Layer)

Each request must:

- Have clear title and description
- Be linked to:
  - Customers
  - Companies
- Show:
  - Number of votes
  - Related requests

---

### UX Requirement:

When viewing a request, Fau must see:

- Who requested it
- How many customers want it
- If it is already planned or not

---

## 3. 📊 Prioritization (Product Layer)

Product team converts requests into:

- Features (or initiatives)

---

### Rules:

- A feature MUST be linked to one or more requests
- A request CAN exist without a feature (backlog)

---

### UX Requirement:

From a request page, user must see:

- Linked feature (if exists)
- Priority
- Status

---

## 4. 🧑‍💻 Execution (Engineering Layer)

Features are broken into:

- Tasks
- Sprints

---

### Integration:

Tasks may be synced with Linear.

---

### System behavior:

- Track progress
- Aggregate status

---

## 5. 🔄 Automatic Feedback Loop

This is CRITICAL.

The system must automatically propagate updates:

Task updated
→ Feature progress updated
→ Request status updated
→ Notifications triggered

UX Requirement:

Fau should NOT need to:

open Linear
ask developers
check manually
6. 👀 Visibility (What Fau Sees)
Overview Page (VERY IMPORTANT)

This page must answer:

What is being worked on?
What is planned next?
What was recently delivered?
Must include:
Top requests (by votes or impact)
Features in progress
Recently completed features
Estimated delivery dates
7. 📅 Predictability

The system must provide:

Expected delivery (ETA)
Progress indicators
UX Requirement:

Each feature/request should show:

Status:
Backlog
Planned
In Progress
Completed
Progress (percentage or tasks completed)
Estimated delivery date
8. 🔔 Communication (Passive Updates)

Fau should be notified automatically when:

A request moves forward
A feature starts
A feature is completed
ETA changes
Channels:
UI (notifications)
Slack (future)
🔗 Core Principle: Traceability (VISIBLE)

This must be visible in the UI:

Customer → Request → Feature → Task → Sprint → Release
UX Requirement:

From ANY entity, user can navigate to related ones.

Example:

From Request → see Feature
From Feature → see Requests
From Task → see Feature
🧠 Core Principle: Simplicity for CS

The system must be usable by non-technical users.

Avoid:
complex terminology
engineering jargon
confusing workflows
Prefer:
clear labels
simple actions
guided flows
🎨 UX Principles
1. Clean Interface
minimal
no clutter
no unnecessary cards
2. Focus on Readability
clear hierarchy
good spacing
easy scanning
3. Action-Oriented
clear CTAs:
"Create Request"
"Link to Feature"
"View Progress"
4. No Dead Ends

User should always:

know what to do next
understand current state
⚠️ What MUST NOT happen
Requests without context (no customer)
Features without requests
Tasks disconnected from features
Users needing to ask for status manually
Duplicate requests everywhere
🚀 Definition of Success

The product is successful when:

Fau says:

"I no longer need to ask Product or Engineering what is happening."

🧪 MVP Scope (Focus)

To validate the product, prioritize:

Request creation + deduplication
Linking requests to features
Feature → task → progress tracking
Automatic status updates
Overview page with clear visibility
🧠 Final Goal

Build a system that:

transforms chaos into structure
connects all teams
reduces manual communication
provides real-time visibility

This is not just a tool.

This is the central brain of product execution.