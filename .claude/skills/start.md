---
name: start
description: Prepares the coding agent at the beginning of a session by ingesting project goals, prior context, previous session plans, and incomplete tasks. Generates a realistic, high-leverage plan to workshop with the user. Use ONLY at the start of a session or when the user invokes /start.

---

## Step 1. Ingest context

Start by reading the following files:

1. `.claude/prd.md` — project requirements and goals.
2. `.claude/context.md` — project history, previous session plans, and cumulative progress.

---

## Step 2. Propose plan for this session

Using the ingested context, propose a structured plan for today’s session.

**Constraints:**
- Be realistic about what can be achieved in one session given the lowest-tier Claude subscription.
- Prioritize **finishing incomplete tasks from the last session** before starting new features.
- Prioritize **high-leverage work**.
- Avoid scope creep or unnecessary narrative.

Return the plan to the terminal first.

Structure:

### Proposed plan for today's session

Step 1:
Step 2:
Step 3:

After presenting the plan:
- Workshop it with the user.
- Refine based on feedback.
- Once confirmed, save it under:

## 2. Previous Session Plan

inside `.claude/context.md`.

Do NOT save a draft plan. Only save the confirmed version.
