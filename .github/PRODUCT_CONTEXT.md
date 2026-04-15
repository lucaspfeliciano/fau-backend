# FAU Platform — Backend Product Context

## What this product is

FAU Platform is a SaaS product that connects Customer Success, Sales, Product, and Engineering.

Its purpose is to help teams turn customer demand into structured execution.

Core workflow:

Feedback -> Request -> Initiative -> Sprint -> Delivery -> Changelog

---

## Core product concepts

### Feedback

Feedback is raw input.

It can come from:

- customers
- testers
- public portal
- widget
- manual entry
- future integrations such as Slack or Fireflies

Feedback represents what people said, not the team’s final understanding.

---

### Request

Request is the main internal analysis entity.

A Request is created and managed by the internal team.

A Request consolidates demand and should represent the team’s structured understanding of:

- what is being asked
- what the actual problem is
- what possible solutions exist
- which customers are affected

A Request can aggregate:

- multiple feedbacks
- multiple customers

A Request must support:

- problems[]
- solutions[]
- product
- functionality

Important:
Problem is NOT a standalone entity.
Problems are part of a Request.

---

### Initiative

An Initiative is the planning container.

It groups relevant Requests and helps Product organize work before execution.

---

### Sprint

A Sprint is the execution unit.

It is linked to an Initiative and should be prepared for integration with Linear.

Sprint-related data may include:

- ETA
- squad
- externalLinearSprintId

---

### Delivery / Changelog

Once work is delivered, it should be communicated through changelog entries.

This is the customer-facing communication layer.

---

### Playground

Playground is a discovery workspace.

It exists before Requests.

It should allow users to:

- collect evidence
- upload files
- write notes
- define problems
- explore solutions
- prioritize ideas
- convert mature items into Requests

Playground is exploratory and should not directly affect roadmap/execution until conversion.

---

## Product rules that matter for backend design

- Feedback and Request must remain separate
- Problem must not become a separate backend entity
- Request is the central structured entity
- Requests can link multiple feedbacks and multiple customers
- The domain must stay simple and explicit
- Score logic is currently out of scope and should not be reintroduced unless explicitly requested
- Public portal behavior must not rely on admin access-token hacks
- Workspace scoping is critical across all entities

---

## What the product should help users do

The system should let a user answer:

- What are customers saying?
- Which signals have been consolidated into Requests?
- What is the actual problem?
- What solutions are being considered?
- What has been planned?
- What is being executed?
- What has been delivered?

---

## Current product direction

The product should evolve toward:

- clearer separation between raw input and internal analysis
- stronger traceability
- better Linear-centered execution visibility
- easier customer/tester participation through public feedback flows
- a lighter and clearer product experience overall

---

## Backend implementation philosophy

When implementing backend features:

- prefer domain clarity over clever abstractions
- keep entities aligned with the product language
- avoid speculative complexity
- support the workflow, not generic CRUD for its own sake
