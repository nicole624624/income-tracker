# Income Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a phone-first income tracker with one-tap 199 RMB sale recording and a piggy-bank goal progress view.

**Architecture:** Keep money calculations in `app-core.mjs` and browser behavior in `app.js`. Use a static `index.html` and `styles.css` so the app can open directly from disk or via a tiny local server.

**Tech Stack:** HTML, CSS, vanilla JavaScript, browser `localStorage`, Node built-in test runner.

---

### Task 1: Core Calculations

**Files:**
- Create: `app-core.mjs`
- Create: `tests/app-core.test.mjs`

- [ ] Write tests for default sale entries, custom entries, monthly summaries, daily grouping, and goal progress.
- [ ] Run `node --test tests/app-core.test.mjs` and confirm tests fail because `app-core.mjs` does not exist yet.
- [ ] Implement exported functions in `app-core.mjs`.
- [ ] Run `node --test tests/app-core.test.mjs` and confirm tests pass.

### Task 2: Mobile Interface

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `app.js`

- [ ] Build the phone-first layout with summary cards, piggy-bank water visual, quick add button, custom amount controls, and grouped records.
- [ ] Wire the UI to `app-core.mjs`.
- [ ] Persist entries, goal, and unit price to `localStorage`.
- [ ] Run a local server and inspect the page in a mobile-sized browser viewport.

### Task 3: Verification

**Files:**
- Verify all created files.

- [ ] Run `node --test tests/app-core.test.mjs`.
- [ ] Run a smoke test that imports `app-core.mjs` and computes a realistic month.
- [ ] Start a local server and provide the user with the URL.
