# HubSpot Integration — Product Context

## Purpose

HubSpot is the source of truth for customer data.

FAU Platform should use HubSpot to:

- import customers
- enrich Requests with real customer impact
- understand business value behind demand

---

## Core concept

HubSpot = customer data  
FAU = product decision layer

---

## What this integration should enable

Users should be able to:

- import customers into FAU
- sync customer data
- link customers to:
  - feedback
  - requests

---

## Customer data

Typical fields:

- name
- email
- company
- revenue (optional)
- plan/tier (optional)

---

## How FAU uses this data

Customers should be:

- linked to feedback
- linked to requests

This allows answering:

- how many customers are affected?
- which customers are affected?
- what is the revenue impact?

---

## UX expectations

Inside FAU:

- Request should show:
  - list of linked customers
  - optional customer value

- Feedback may optionally include:
  - customer info

---

## Rules

- HubSpot is the source of truth for customers
- FAU should not become a CRM
- Keep customer data simple inside FAU

---

## Future possibilities

- automatic customer enrichment
- revenue-based prioritization
- customer segmentation
