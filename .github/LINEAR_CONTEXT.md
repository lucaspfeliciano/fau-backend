# Linear Integration — Product Context

## Purpose

Linear is the execution layer of the product.

FAU Platform is responsible for:

- understanding demand (Feedback, Requests)
- structuring problems and solutions

Linear is responsible for:

- execution
- task tracking
- delivery

---

## Core concept

FAU = thinking + planning  
Linear = execution

---

## What this integration should enable

Users should be able to:

- link Requests to Linear issues
- link Initiatives/Sprints to Linear cycles
- understand execution status directly from FAU
- avoid duplicating work across tools

---

## Mapping

### Request → Linear Issue

A Request may be linked to:

- one or more Linear issues

Each issue represents:

- implementation work
- technical breakdown

---

### Initiative → Linear Cycle (future)

An Initiative may map to:

- a Linear cycle

This allows:

- tracking progress
- aligning product planning with engineering delivery

---

## Data that may be synced

From Linear to FAU:

- issue status
- assignee
- cycle
- timestamps

From FAU to Linear:

- issue title
- description
- linked context (problem + solution)

---

## UX expectations

Inside FAU:

- Request should show:
  - linked Linear issues
  - status of those issues

- Initiative/Roadmap should show:
  - linked Linear cycle
  - progress

---

## Rules

- Linear is NOT the source of truth for product understanding
- FAU remains the source of truth for:
  - problems
  - solutions
  - customer demand

- Linear is only for execution tracking

---

## Future possibilities

- create Linear issue directly from Request
- auto-sync status updates
- show progress indicators (e.g. % complete)
