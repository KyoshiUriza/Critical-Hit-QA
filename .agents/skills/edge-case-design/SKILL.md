---
name: edge-case-design
description: Generate boundary and edge cases for any input, state, or flow — value boundaries, Unicode and text traps, timing and concurrency, state transitions, and environment limits. Use when asked for edge cases, boundary tests, or negative input coverage.
---

# Edge case design

Most defects live at boundaries: the smallest, the largest, the empty, the one-over, and the moment two things happen at once. Work through the categories below and keep the ones that are plausible for this app; say which you dismissed and why.

## Value boundaries

For any numeric or countable thing: `0`, `1`, `2`, `n-1`, `n`, `n+1`, maximum, maximum+1, negative, non-integer. For a list: empty, one item, many items, one over any documented cap.

## Text input traps

- Empty string; a single space; only spaces; leading and trailing spaces.
- One character; the exact maximum length; one over; something enormous (10k characters pasted).
- A single unbroken word longer than the container — tests wrapping and truncation.
- Newlines and tabs pasted into a single-line field.

## Unicode

- Emoji (`✈️`), emoji with a skin-tone modifier (`👍🏿`), and family/ZWJ sequences — these are multi-code-point and break naive length limits and truncation.
- Non-breaking space `U+00A0` — looks like a space; `String.trim()` does remove it in JavaScript.
- Zero-width space `U+200B` — invisible, and `trim()` does **not** remove it, so it commonly slips past "is it empty?" validation and creates a blank-looking record.
- Right-to-left text (Arabic, Hebrew) and the RTL override `U+202E`.
- Combining accents, and the same string in composed vs decomposed form (`é` as one code point vs `e` + combining acute) — they look identical and compare unequal.
- Astral-plane characters (`𝔘`), which are two UTF-16 code units.

## Injection-flavored strings

`<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`, `"><b>bold`, `'; DROP TABLE items;--`, `{{7*7}}`, `../../etc/passwd`. On a client-only app the realistic risk is **stored cross-site scripting (XSS)** — text saved and later redisplayed as live HTML. Verify the text renders as literal characters.

## Duplicates and identity

The same value entered twice; values differing only by case, by trailing space, or by Unicode normalization form. Decide with the team whether duplicates are intended before filing.

## State and timing

- Act before the app is ready; double-click the submit control; press Enter twice quickly.
- Cancel halfway; navigate away mid-edit; press Escape; click outside the field — and check whether that saves or discards, and whether that is what a user would expect.
- Browser back and forward after a state change; refresh mid-flow; open the app in two tabs and change the same record in both.
- Offline, slow network, request failure.

## Persistence

Where state lives in the browser (localStorage, session storage), test: cleared storage, storage disabled, storage full, corrupt or hand-edited stored data, and private-browsing mode.

## Environment

Narrow mobile viewport, 200% zoom, long OS font sizes, dark mode, keyboard-only, and each supported browser engine — Chromium, Firefox, and WebKit behave differently around focus, form validation, and text input.

## Output

For each edge case kept: the input, the expected behavior, and the risk it covers. Turn the ones worth keeping into test cases with the `writing-test-cases` skill; expected results must state the **correct** behavior even where the app currently gets it wrong.
