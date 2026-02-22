---
name: handover
description: Updates .claude/context.md to prepare the next coding agent for the next session. Summarises cumulative project state, the current session’s progress, and proposes a structured plan for the next session. Use ONLY at the end of a session when the user invokes /handover or when nearing token limits.
---

# Handover Protocol

You are responsible for preparing the next coding agent for continuity.

Follow these steps strictly and in order.

---

## Step 1. Update metadata at the top of .claude/context.md

Start by updating the top of .claude/context.md with:

1. Last Updated: DD-MM-YYY
2. Session #: X

If Session # does not exist, increment from the previous session.  
Do NOT remove historical context below unless explicitly instructed.

---

## Step 2. Update overall project progress
Update the cumulative project state concisely and structurally under:

## 1. Overall Project Progress

Summarise grouped under:

### Architecture and Setup
- Only persistent structural decisions
- High-level system design
- Environment setup

### Features Implemented
- Completed features only
- No in-progress work

### Infrastructure and Tooling
- CI/CD
- Hosting
- Dev tooling
- Testing framework

### Decisions Made
- Architectural decisions
- Trade-offs
- Constraints
- Assumptions

Be concise but information-dense.  
Avoid narrative explanation.

---

## Step 3. Update current session progress

Update the project progress accomplished in this session concisely and structurally under:

## 2. Last Session Progress

Include:

### Tasks Worked On
- Concrete actions taken

### Code Changes Made
- Files created/modified
- Major refactors

### Key Decisions
- New constraints introduced
- Scope changes

### Current System State
Explicitly describe:
- What works
- What partially works
- What is broken
- Known technical debt
- Blockers

This section must allow a new agent to start working immediately without re-reading the entire codebase.

---

## STEP 4 — Identify Incomplete Work

Add:

## 3. Incomplete / Actionable Items

Group under:

### High Priority (Blockers)
### Medium Priority
### Low Priority / Nice-to-have

These must reflect unfinished items from THIS session.

---

## STEP 5 — Propose Plan for Next Session

Using the updated `.claude/context.md`, propose a structured plan for the next session.

Constraints:
- Be realistic about my Claude token limits under my current subscription (lowest tier).
- Prioritise high-leverage tasks.
- Prioritise finishing incomplete work before new features.
- Avoid scope creep.

Return the plan to the terminal first.

Structure:

### Proposed Plan for Session X+1

Step 1:
Step 2:
Step 3:

After presenting the plan:
- Workshop it with the user.
- Refine based on feedback.
- Once confirmed, save it under:

## 4. Next Session Plan

inside `.claude/context.md`.

Do NOT save a draft plan. Only save the confirmed version.

---

# Rules

- Be concise but high signal.
- No fluff.
- No repetition of unchanged context.
- Preserve historical continuity.
- Never overwrite useful prior information.
- Optimise for the next agent’s execution speed.

End of protocol.
