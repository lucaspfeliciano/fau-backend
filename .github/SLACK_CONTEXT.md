# Slack Integration — Product Context

## Purpose

Slack is a source of real-time, unstructured feedback.

FAU Platform should use Slack to:

- capture product-related conversations
- transform them into Feedback entries

---

## Core concept

Slack = raw conversations  
FAU = structured product input

---

## What this integration should enable

Users should be able to:

- connect Slack workspace
- select channels to monitor
- ingest messages as Feedback

---

## Input types

Slack messages may include:

- complaints
- feature requests
- bugs
- informal feedback

---

## How ingestion should work

Messages should be transformed into Feedback:

Fields:

- title (generated)
- description (message content)
- source = "slack"
- optional:
  - user name
  - channel name
  - message link

---

## UX expectations

Inside FAU:

- Feedback items should show:
  - Slack source badge
  - origin context (channel/user)

---

## Rules

- Do NOT import everything blindly
- Allow filtering by channel
- Keep Slack ingestion lightweight

---

## Future possibilities

- AI summarization of threads
- grouping similar messages
- deduplication suggestions
