# Fireflies Integration — Product Context

## Purpose

Fireflies is a source of structured meeting notes.

FAU Platform should use Fireflies to:

- extract insights from meetings
- generate Feedback automatically

---

## Core concept

Fireflies = meeting notes  
FAU = product signal extraction

---

## What this integration should enable

Users should be able to:

- connect Fireflies
- import meeting transcripts/notes
- automatically extract:
  - feedback
  - problems
  - potential requests

---

## Input types

From Fireflies:

- transcripts
- summaries
- action items

---

## How extraction should work

The system should:

1. parse meeting notes
2. identify:
   - feature requests
   - complaints
   - pain points
3. convert them into Feedback entries

---

## Feedback output

Generated Feedback should include:

- title (AI-generated)
- description (extracted insight)
- source = "fireflies"
- optional:
  - meeting reference
  - participants

---

## UX expectations

Inside FAU:

- Feedback should show:
  - Fireflies source badge
  - origin context (meeting)

---

## Rules

- Keep extraction simple for MVP
- Avoid overcomplicated NLP pipelines initially
- Focus on value: turning conversations into usable input

---

## Future possibilities

- AI clustering of insights
- automatic Request suggestions
- linking multiple meetings into trends
