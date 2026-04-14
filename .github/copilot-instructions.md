# FAU Platform Backend — Copilot Instructions

## Project identity

This backend powers **FAU Platform**, a SaaS product that connects:

- Customer Success
- Sales
- Product
- Engineering

The product workflow is:

**Feedback -> Request -> Initiative -> Sprint -> Delivery -> Changelog**

This backend must reflect the product model exactly.

---

## Core domain model

### Feedback

Feedback is **raw external input** from customers or testers.

Examples:

- public portal submissions
- widget submissions
- Slack-originated feedback
- manual feedback capture

Feedback is not the same as Request.

Feedback should stay lightweight and intake-oriented.

---

### Request

Request is the **main internal analysis entity**.

A Request is a consolidated understanding of demand.

A Request may aggregate:

- multiple feedback items
- multiple customers

A Request must support:

- title
- description
- feedbackIds[]
- customerIds[]
- problems[]
- solutions[]
- product
- functionality
- status

Important:

- **Problem is NOT a standalone entity**
- Problems are part of a Request
- Solutions are part of a Request

Requests are used by the internal team to understand what the real issue is and what possible solutions exist.

---

### Initiative

An Initiative is the main planning container.

It can link multiple Requests.

It is used to organize planning before or alongside execution.

---

### Sprint

A Sprint is the execution unit.

A Sprint belongs to or is linked to an Initiative and should support future or current integration with Linear.

Sprint-related fields can include:

- eta
- squad
- externalLinearSprintId

---

### Customer

Customers represent companies or contacts affected by demand.

A single Request may relate to multiple customers.

---

### Changelog

Changelog entries communicate delivered value after work is completed.

---

## Backend architecture expectations

Use:

- NestJS
- TypeScript
- MongoDB
- DTO validation
- clear module separation
- simple and maintainable service structure

Prefer:

- modules
- controllers
- services
- repositories or model services if already used

Avoid:

- overengineering
- unnecessary abstractions
- deep inheritance
- introducing new architectural patterns unless clearly needed

---

## Critical product rules

1. Never treat Feedback and Request as the same entity.
2. Never reintroduce a standalone Problem entity.
3. Keep Request as the center of internal analysis.
4. Keep Playground separate from Request until conversion.
5. Keep public-facing flows simple and workspace-scoped.
6. Keep the product workflow traceable:
   - Feedback -> Request
   - Request -> Initiative
   - Initiative -> Sprint
   - Sprint -> Delivery
   - Delivery -> Changelog

---

## Playground rules

Playground is a discovery workspace.

It supports:

- evidence assets
- canvas nodes
- prioritization board cards
- conversion into Requests

Playground is exploratory and draft-oriented.
It must not directly behave like Roadmap or Request management.

When converting a Playground item into a Request:

- preserve problem and solution context
- create a valid Request
- do not create unrelated entities

---

## Public portal rules

The public portal must work by:

- workspace slug
- workspace-level visibility settings

It must NOT depend on:

- admin session tokens
- manual localStorage token extraction
- per-workspace environment variables for normal public portal usage

Public portal feedback should enter the system as Feedback, not directly as a Request, unless explicitly designed otherwise.

---

## API design expectations

Prefer:

- clear REST endpoints
- predictable naming
- workspace scoping where appropriate
- DTO-based input validation
- explicit response shapes

Do not:

- expose internal-only fields unless needed
- expose IDs in user-facing frontend data unless necessary for app logic
- mix raw intake endpoints with internal analysis endpoints

---

## Validation and modeling rules

### Request modeling

Keep these simple for MVP:

- problems[] as simple strings or lightweight objects
- solutions[] as simple strings or lightweight objects
- product as string or simple reference
- functionality as string or simple reference

Do not split these into standalone collections unless explicitly required later.

### Customer links

A Request can link multiple customers.
A Feedback can optionally link to one customer or submitter.

---

## Linear integration expectations

Linear integration is important, but do not overbuild it prematurely.

Backend should support fields and service structure for:

- linking internal sprint to Linear sprint
- linking future cards/issues if needed

Keep the first implementation lightweight and extensible.

---

## Overview / configuration expectations

Workspace-level configuration may control:

- enabled overview widgets
- public portal visibility
- public roadmap visibility
- public changelog visibility

Persist configuration cleanly by workspace.

---

## Coding expectations

When generating code:

- preserve naming consistency
- preserve existing module boundaries when reasonable
- write readable TypeScript
- add validation decorators where appropriate
- avoid hidden magic
- prefer explicit domain naming

When modifying existing code:

- do not rewrite unrelated modules
- do not rename core concepts casually
- do not change API contracts without necessity

---

## Testing expectations

When adding new backend features:

- add focused unit or integration tests where practical
- prefer testing service logic and controller behavior for new modules
- keep tests readable and small

---

## Copilot behavior guidance

When asked to implement a feature:

1. first align with this domain model
2. explain the plan briefly
3. implement incrementally
4. avoid touching unrelated modules
5. prefer safe changes over wide refactors

If a requested change conflicts with this document, follow this document unless the user explicitly overrides it.
