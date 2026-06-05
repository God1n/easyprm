---
name: big-picture-writing
title: Writing the big-picture doc
when_to_use: Before writing or editing docs/big-picture.md.
related: [requirements-writing]
---

# Writing the big-picture doc

One page. One audience. One outcome. If big-picture.md takes longer than 20 minutes to write, you don't understand the project well enough to plan it yet.

## Required sections

1. **Problem** — one paragraph. What pain exists, for whom, and how often they feel it. No solution allowed here.
2. **Solution** — one paragraph. What you're building and why it solves the problem better than alternatives (including "do nothing").
3. **Target user** — one sentence. Not "developers" — "solo developers who ship production apps without a dedicated PM."
4. **Success criteria** — 2–4 bullet points. Measurable outcomes, not feature lists. "Users complete first project plan in under 10 minutes" beats "intuitive UX."
5. **Out of scope** — 2–4 bullet points. Explicitly name things you are NOT building. Future-you will thank you.

## Smell tests

- If any section is longer than a paragraph, you're writing an essay, not a north star. Cut it.
- If "success criteria" contains the word "seamless," rewrite it. Seamless is not measurable.
- If "out of scope" is empty, you haven't thought about scope creep yet. Think now.

## Example success criteria

Good: "A new user can create their first project and first task in under 5 minutes without reading docs."
Bad: "Users find the tool easy to use and productive for their workflows."

## What comes next

big-picture.md feeds sfr.md: every requirement in sfr should trace back to a problem or success criterion stated here. If you can't trace it, it's scope creep.
