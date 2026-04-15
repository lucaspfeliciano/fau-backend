# FAU Platform Backend — Copilot Instructions

FAU Platform is a SaaS product that connects Customer Success, Sales, Product, and Engineering.

## Core workflow

Feedback -> Request -> Initiative -> Sprint -> Delivery -> Changelog

## Domain model

- Feedback = raw input from customers/testers
- Request = internal consolidated analysis item
- Initiative = planning container
- Sprint = execution unit
- Changelog = shipped communication
- Playground = discovery workspace for evidence, notes, problems, solutions, prioritization, and conversion into Request

## Critical domain rules

- Feedback and Request are NOT the same thing
- Request is the main internal analysis entity
- A Request can aggregate multiple feedbacks and multiple customers
- A Request must support:
  - problems[]
  - solutions[]
  - product
  - functionality
- Problem is NOT a standalone entity
- Do not reintroduce score logic unless explicitly asked

## Backend priorities

- Use NestJS + MongoDB cleanly
- Keep DTO validation strong
- Keep modules separated by responsibility
- Prefer simple embedded structures when the product model calls for it
- Keep naming aligned with the domain model above
- Avoid overengineering

## Implementation style

- Prefer incremental changes
- Explain the plan briefly before implementing
- If asked for sprints, generate checklist first and implement Sprint 1 only
- Do not invent new entities unless explicitly requested

## Important product rule

When in doubt, preserve this meaning:

- Feedback = raw demand
- Request = structured internal understanding of that demand
