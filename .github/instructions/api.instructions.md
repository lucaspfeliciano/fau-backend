---
applyTo: '**/*.controller.ts,**/*.service.ts,**/*.module.ts,**/*.schema.ts,**/*.entity.ts,**/*.dto.ts'
---

# FAU Platform API Instructions

You are working on the backend API of FAU Platform.

## Core entities

### Feedback

Raw external input.

Typical fields:

- workspaceId
- title
- description
- source
- publicSubmitterName
- publicSubmitterEmail
- customerId

### Request

Main structured internal entity.

Typical fields:

- workspaceId
- title
- description
- feedbackIds[]
- customerIds[]
- problems[]
- solutions[]
- product
- functionality
- status
- createdBy

Important:

- Problem is NOT a separate entity
- problems[] and solutions[] should remain lightweight unless explicitly changed

### Initiative

Planning layer linked to Requests.

### Sprint

Execution layer linked to Initiative and prepared for Linear mapping.

### Playground

Supports:

- PlaygroundWorkspace
- PlaygroundAsset
- PlaygroundNode
- PlaygroundBoardCard

## API rules

- Keep controllers thin
- Keep services focused
- Validate write operations
- Scope everything correctly by workspace
- Use explicit, predictable response shapes
- Do not use admin auth token hacks for public portal behavior

## Non-goals

- Do not create standalone Problem modules/entities
- Do not add unnecessary abstractions
- Do not add speculative architecture without product need
