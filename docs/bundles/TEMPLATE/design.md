---
number: NNNN
slug: short-hyphenated-slug
design_status: draft           # draft → accepted (or superseded)
implementation_status: none    # advances to active once an implementation-plan.md is written; flips to `umbrella` at acceptance for umbrella designs that spawn child bundles
---

# NNNN — <Human-readable title>: design

> Delete this template's prose-style guidance once the real content lands. Sections may be reordered if it improves readability, but every section below should be present (or explicitly marked "N/A" with a one-line reason).
>
> **The body of this document is `## Design`.** That's where the architecture, lifecycle, failure modes, and walkthroughs live. The earlier sections (Problem / Goals / Requirements / Current state) frame what's being designed; the later sections (Why this design / Alternatives considered) defend the chosen shape after the fact. If you find yourself spending most of your effort in `## Alternatives considered`, you are writing an option-selection memo, not a design — stop and shift the weight.
>
> **Be ruthless about tangents.** Only material that informs or articulates the design belongs here. Past-considered-and-discarded ideas, parallel tracks, and "for completeness" prose are noise; cut them. Git history is the audit trail for rejected options — the design body is not.

## Problem statement

What are we trying to solve, and why now? State the success criteria concretely — a future reader should be able to tell whether the implementation worked just by reading this paragraph.

## Goals

- One bullet per goal. Each goal is something the design must achieve.
- Order from most to least important; the design will trade off lower-priority goals first when forced.

## Non-goals

- Explicit list of things this design will *not* address. Non-goals stop scope creep and are as important as goals.

## Requirements

### Functional requirements

### Non-functional requirements

## Current state

Snapshot of how the relevant parts of the system work today — only enough for the reader to understand the gap the design closes. Link out to deeper references rather than restating them.

## Design

**This is the body of the document.** Describe the architecture you are committing to, in enough detail that an implementation-plan drafter could draft from this section alone, without re-reading the appendix. Use the subsections below; add others as needed; mark a subsection N/A with a one-line reason if it genuinely doesn't apply (e.g. a pure-greenfield design has no migration path).

The design document MUST stand on its own. A reader should be able to understand the proposed system from reading this section alone, without cross-referencing `design-open-questions.md`. If a load-bearing detail lives in an open question, that question is unresolved architecture — fold the recommendation into this section and leave only the user-facing tradeoff in the question.

### Architecture

The components of the proposed system and how they fit together. Name the pieces (services, scripts, roles, modules, files), describe each one's responsibility in one or two sentences, and show the boundaries between them. A diagram is welcome but not required; clear named components with crisp responsibilities are.

### Lifecycle / data flow

How state moves through the system over time. For a service: request lifecycle, retry behavior, persistence boundaries. For a workflow: stage transitions, who triggers each stage, what artifacts each stage produces. For a migration: phase ordering and what's true at the end of each phase.

### Failure modes & recovery

What can go wrong, what the system does about it, and what a human has to do when automation can't handle it. Be specific — "we'll retry" is not a failure mode treatment. Name the concrete failures (component X crashes mid-write; network partition between A and B; concurrent operation collision) and pair each with the recovery story.

### Migration path *(if applicable)*

How we get from § Current state to the proposed design without breaking what's running. Phase ordering, rollback points, what's reversible at each step, and which existing in-flight work (other bundles, pending changes) the migration coexists with. Mark N/A for greenfield designs.

### End-to-end walkthroughs

At least one concrete narrative story of the system in action — a realistic scenario walked through from start to finish, naming the components from § Architecture as they participate. Walkthroughs are the cheapest way to surface gaps that bullet-list architecture sections hide. Add walkthroughs for the obvious failure cases too if they're non-trivial.

## Why this design

Short prose (a few paragraphs at most) defending the chosen shape. Lead with the property of the problem that makes this shape fit; reference § Goals where you make a tradeoff. This is not the place to refight alternatives — that's the appendix.

## Alternatives considered

**Appendix.** One paragraph per alternative, no more. Each entry names the alternative, sketches what it would have looked like, and gives the one-line reason it lost. The point is the audit trail and helping a future reader understand why other obvious paths weren't taken — not to demonstrate the agent considered every possibility. If a design genuinely has no plausible alternatives worth recording, this section can be a single line saying so; do not strawman alternatives to fill space.

### <Alternative name>

One paragraph: shape, single biggest reason it lost. Optionally call out blast radius / reversibility if those were the deciding factors.

### <Alternative name>

(Same shape.)

## Implementation plans this design will spawn

Identify the `implementation-plan.md` file(s) that will derive from this design once it's `accepted`.

- **Single-bundle case:** one `implementation-plan.md` lives in this same task directory. State that here and outline the major task-list shape it will take.
- **Umbrella case:** enumerate the new task numbers and slugs that will be created, each with its own bundle linking back via `derived_from_design: NNNN`. Briefly describe each sub-task's scope.

## References

- Links to upstream docs, related tasks, prior incidents, etc.
