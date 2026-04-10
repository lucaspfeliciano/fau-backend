# 🚀 Product Instructions - CS x Product x Engineering Platform

## 🧠 Product Vision

This application is a **collaboration platform that connects Customer Success (CS), Sales, Product, and Engineering teams**.

The goal is to centralize:

- Customer requests (feature requests, bugs, improvements)
- Product prioritization
- Engineering execution (tasks, sprints)
- Visibility for all stakeholders

This platform should replace tools like Canny + Linear + manual communication by providing a **single source of truth**.

---

## 🎯 Core Problem

Currently:

- CS/Sales collect requests but lose context or duplicate them
- Product teams manually organize and prioritize
- Engineering works in isolation (Linear/Jira)
- No clear visibility for stakeholders
- No automation from meeting notes or conversations

---

## 💡 Proposed Solution

A system where:

1. CS/Sales create or import requests
2. Requests are grouped, deduplicated, and linked to customers
3. Product prioritizes and converts requests into initiatives/sprints
4. Engineering executes tasks
5. Status updates flow automatically back to all stakeholders

---

## 🧩 Core Features

### 1. Requests Management

- Create request manually
- Import request from meeting notes (AI parsing)
- Deduplicate similar requests
- Upvote system (multiple customers requesting same thing)
- Link request to:
  - Customer
  - Company
  - Revenue impact (optional)

---

### 2. AI Input (Important)

- Accept raw meeting notes (copy/paste)
- Parse and extract:
  - Feature requests
  - Bugs
  - Pain points
- Try to match with existing requests
- If similar exists → increment "votes"
- If not → create new request

Future:

- Integration with tools like Fireflies, Slack, etc.

---

### 3. Product Layer

- Convert requests into:
  - Initiatives
  - Features
- Prioritize using:
  - Votes
  - Customer impact
  - Strategic tags
- Status flow:
  - Backlog
  - Planned
  - In Progress
  - Completed

---

### 4. Engineering Layer

- Create tasks from features
- Group tasks into sprints
- Track:
  - Status
  - Estimates
  - Delivery dates
- Sync with external tools (Linear)

---

### 5. Visibility & Communication

- CS/Sales can:
  - Track request status
  - See roadmap
  - Know delivery expectations
- Automatic updates when:
  - Status changes
  - Sprint progresses
  - Feature is released

---

### 6. Integrations (Important)

- Slack (notifications)
- HubSpot (customer data)
- Linear (engineering sync)
- Google OAuth (authentication)

---

### 7. Multi-team Support

- Organizations (multi-tenant)
- Teams inside organizations
- Users with roles:
  - Admin
  - Editor (Product/Engineering)
  - Viewer (CS/Sales)

---

## 🏗️ Technical Stack

### Backend

- Node.js
- NestJS
- TypeScript
- MongoDB (Mongoose)

### Architecture

- Modular architecture (NestJS modules)
- Clean Architecture principles
- Separation of concerns:
  - Controllers
  - Services
  - Repositories

---

## 📦 Main Modules

- AuthModule
- UsersModule
- OrganizationsModule
- TeamsModule
- RequestsModule
- CustomersModule
- CompaniesModule
- ProductModule (initiatives/features)
- EngineeringModule (tasks/sprints)
- IntegrationsModule
- AIProcessingModule

---

## 🧱 Data Modeling Guidelines

### Request

- id
- title
- description
- status
- votes
- customerIds[]
- companyIds[]
- tags[]
- createdBy
- organizationId
- timestamps

### Customer

- id
- name
- email
- companyId
- organizationId

### Company

- id
- name
- revenue (optional)
- organizationId

### Feature / Initiative

- id
- title
- description
- relatedRequests[]
- status
- priority
- organizationId

### Task

- id
- title
- description
- featureId
- sprintId
- status
- estimate

### Sprint

- id
- name
- startDate
- endDate
- status

---

## 🔐 Auth & Permissions

- Google OAuth login
- JWT authentication
- Role-based access control (RBAC)

Roles:

- Admin → full access
- Editor → create/edit content
- Viewer → read-only

---

## 📡 API Design

- RESTful APIs
- Use DTOs with validation (class-validator)
- Use global error handling
- Use pagination for lists
- Use filters (status, team, etc.)

---

## 📄 Documentation

- Use Swagger (NestJS OpenAPI)
- All endpoints must be documented
- Include request/response examples

---

## 🧪 Testing (Future)

- Unit tests for services
- Integration tests for APIs

---

## ⚙️ Development Rules

- Use TypeScript strict mode
- Use ESLint + Prettier
- Use environment variables (.env)
- Use Docker for local MongoDB

---

## 🚀 Development Strategy

The system must be built in iterations:

1. Auth + Organizations
2. Requests CRUD
3. Customers & Companies
4. Product (features/initiatives)
5. Engineering (tasks/sprints)
6. AI processing (basic version)
7. Integrations
8. Notifications

---

## 🧠 Important Notes

- Avoid overengineering
- Keep modules independent
- Prefer simple solutions first
- Focus on delivering value quickly

---

## 🎯 Goal

Build a system that:

- Reduces manual work
- Increases visibility
- Connects teams
- Uses AI to accelerate workflows

## 🔗 Core Principle: Full Traceability

Every piece of data must be connected.

The system must allow tracking:

Customer → Request → Feature → Task → Sprint → Release

At any moment, any user should be able to answer:

- Which customers requested this feature?
- Which requests are being worked on?
- What is the current engineering status?
- When will it be delivered?

## 🔄 Core Principle: Automatic Feedback Loop

The system must automatically propagate updates across all layers:

- When a task status changes → feature is updated
- When a feature progresses → requests are updated
- When a request is updated → CS/Sales are notified

No manual syncing should be required.

The system must act as a real-time bridge between teams.

## 🧠 Core Principle: Unstructured to Structured Input

The system must convert unstructured input into structured data.

Examples:

- Meeting notes
- Sales conversations
- Slack messages

These inputs should be transformed into:

- Requests
- Linked customers
- Existing request matches (deduplication)

This is a key differentiator of the platform.
