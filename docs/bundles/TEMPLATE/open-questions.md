# NNNN — Open questions (<phase>)

> Delete this template's prose-style guidance once the real content lands.
>
> **Scope.** This file holds open questions for one phase of one bundle — either the design phase (filename: `design-open-questions.md`, lives next to `design.md`) or the implementation-planning phase (filename: `plan-open-questions.md`, lives next to `implementation-plan.md`). An umbrella design and each of its child plans get their own separate file in their own bundle. Never share one file across phases.
>
> **Lifecycle.** Each question moves through `OPEN` → `RESOLVED`. A `design.md` cannot move to `design_status: accepted` while any of its questions are `OPEN`; a `implementation-plan.md` cannot move to `implementation_status: active` while any of its questions are `OPEN`. Resolved questions stay in this file as the audit trail; they are also folded back into the design or plan body so a reader doesn't have to cross-reference.
>
> **How the iteration loop works.**
>
> 1. The drafting agent (`/create-design` or `/create-plan`) writes each question to this file with a recommended answer plus a stub `### User Feedback` section. The agent does not type into `User Feedback` — that section is reserved for the user.
> 2. **Interactive-first.** In the same turn it writes the questions to this file, the drafting/review agent calls `AskUserQuestion` (batched up to 4 questions per call) so the user can resolve in-session without context-switching to their editor. Each question's options surface the agent's recommendation (option 1, "Recommended"), the strongest 1–2 alternatives drawn from `**Why this and not the alternative(s):**`, and a "Defer to file" option for users who want to address async; the auto-added "Other" lets the user reply with free-form prose. **The file write is not optional** — it is the durable audit trail regardless of how the user answers.
> 3. The user can answer interactively, fill in `### User Feedback` directly in the editor, or add prose to the "Overall Plan User Feedback and Questions from User" section. Any of these paths is valid.
> 4. When an interactive answer comes back, or in the next agent turn after the user has filled in `User Feedback`, the agent treats the answer as authoritative input, writes a `**Resolution:**` block summarising the decision and any concrete actions taken (e.g. "design body updated to ..."), copies the user's chat prose into `### User Feedback` (so the file matches what the conversation decided), and flips that question's `STATUS: OPEN` → `STATUS: RESOLVED`. Anything still `OPEN` (e.g. user picked "Defer to file" or skipped a question) is surfaced back in the next agent turn so they know what remains.
> 5. Repeat until every question is `RESOLVED`. Only then can the design / plan advance status.
>
> **When `AskUserQuestion` is not the right fit.** If a question genuinely cannot be reduced to ≤4 distinct options (e.g. an open-ended architectural framing where the agent has no defensible recommendation yet), write the file entry but skip the interactive call for that one — note in the agent's chat reply that it's deferred to the file. The interactive surface is for decisions, not blank-page brainstorming.

---

# Overall Plan User Feedback and Questions from User

<!-- Reserved for the user. The drafting agent leaves this empty. -->

---

# Agent Questions for User

## Q1. <One-line question title>

**Recommendation:** the agent's recommended answer in 1–3 sentences. Be opinionated — the recommendation should be defensible against the obvious alternatives. If the question is genuinely a coin flip, say so explicitly.

**Why this and not the alternative(s):** one or two sentences naming the next-best option(s) and why the recommendation wins. This protects against the user reading just the recommendation and missing that there *are* tradeoffs.

**Cost of override:** what changes downstream if the user picks differently. Sometimes negligible, sometimes significant — make it explicit so the user can decide informedly.

### User Feedback

<!-- Reserved for the user. The drafting agent leaves this empty. -->

**STATUS: OPEN**

---

## Q2. <Next question>

(Same shape as Q1.)

### User Feedback

<!-- Reserved for the user. -->

**STATUS: OPEN**

---

<!-- After the user fills in feedback and an agent processes it, each question's tail looks like:

### User Feedback

<user's prose, lightly edited if helpful>

**Resolution:** the agent's summary of the decision plus the concrete change made (e.g. "design body § 4 updated to choose option B; plan 0024 Step 1 now uses the API key path").

**STATUS: RESOLVED**
-->
