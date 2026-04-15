# FAU Platform — Frontend Product Context

## What this product is

FAU Platform is a SaaS product that connects Customer Success, Sales, Product, and Engineering.

Its purpose is to help teams transform customer demand into structured product decisions and execution.

Core workflow:

Feedback -> Request -> Initiative -> Sprint -> Delivery -> Changelog

---

## How users should experience the product

The product should feel:

- clear
- lightweight
- modern
- structured
- easy to understand
- more like a product workflow tool than an internal admin dashboard

The UI should guide users through the workflow rather than just exposing disconnected pages.

---

## Core product concepts in the UI

### Feedback

Feedback is raw customer or tester input.

In the UI, Feedback should feel like:

- an intake queue
- an inbox of demand
- the place where incoming signals are reviewed

Feedback is not yet structured product understanding.

Typical actions from Feedback:

- review
- create Request
- link to existing Request

---

### Request

Request is the main structured internal entity.

In the UI, Request should feel:

- more curated than Feedback
- more analytical
- more decision-oriented

A Request must help the user understand:

- what the request is about
- what the real problem is
- which solutions are being considered
- which feedbacks led to it
- which customers are affected
- which product/functionality it belongs to

A Request must support:

- problems[]
- solutions[]
- product
- functionality
- linked feedback
- linked customers

Important:
Problem is NOT a separate page or entity in the UI.
Problems are part of a Request.

---

### Initiative

Initiatives are planning containers.

They should help connect Requests to execution.

---

### Sprint / Roadmap

Roadmap and Sprint views should communicate execution and planning clearly.

They should eventually align with Linear and show:

- status
- ETA
- squad
- connected work

The roadmap should not feel like a random board. It should explain what is planned and what is in progress.

---

### Changelog

Changelog is the communication layer.

It should feel customer-facing and easy to scan.

---

### Playground

Playground is a discovery workspace.

It is where users explore ideas before creating Requests.

It should feel:

- lighter
- more creative
- more flexible
- less rigid than the rest of the app

Playground may include:

- evidence uploads
- notes
- problem/solution cards
- a whiteboard/canvas area
- prioritization columns
- convert to Request

---

## Navigation philosophy

Main workflow navigation should focus on:

- Home
- Overview
- Feedback
- Requests
- Roadmap
- Changelog
- Playground

Secondary/admin areas should live under Settings:

- Customers
- Teams
- Integrations
- workspace configuration

The main navigation should reflect the workflow, not the database.

---

## UI principles

- Keep the app simple and premium
- Reduce visual clutter
- Prefer whitespace and hierarchy over dense dashboards
- Do not show IDs or technical/internal metadata in primary UI
- Keep visible text in English unless explicitly requested otherwise
- Make next steps obvious
- Make traceability visible
- Do not overload every screen with every possible field

---

## What the product should help users do

Users should be able to understand:

- what customers are saying
- what has already been consolidated
- what the actual problem is
- what solutions are under consideration
- what has been planned
- what is currently in execution
- what has already been delivered

---

## Current product direction

The product is evolving from a generic dashboard into a structured workflow tool.

The key goals now are:

- better separation between Feedback and Request
- stronger traceability
- cleaner planning and roadmap views
- clearer overview/home experience
- better public/testing participation
- a more polished and guided UX overall

---

## Frontend implementation philosophy

When implementing frontend features:

- optimize for clarity first
- reflect the product workflow
- keep pages focused on their purpose
- avoid generic CRUD feeling
- prefer guided flows over disconnected screens
