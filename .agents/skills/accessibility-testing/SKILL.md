---
name: accessibility-testing
description: Test a feature for keyboard operability, focus visibility, accessible names, contrast, and screen-reader-meaningful structure, citing WCAG 2.2 AA criteria. Use when asked about accessibility, a11y, keyboard support, or screen reader support.
---

# Accessibility testing

Accessibility (often abbreviated **a11y**) testing asks whether someone who cannot use a mouse, cannot see the screen, or cannot distinguish low-contrast colors can still complete the task. Cite **WCAG 2.2 level AA** criteria by number so findings are arguable against a standard rather than a preference.

## Keyboard pass — do this first, it finds the most

Unplug the mouse mentally and complete the whole flow with Tab, Shift+Tab, Enter, Space, Escape, and arrow keys.

- Can every action be reached and performed? A control usable only by hover or click fails **2.1.1 Keyboard**.
- Can you always get back out of a component? Trapped focus fails **2.1.2 No Keyboard Trap**.
- Is the focused element always visibly indicated? A missing focus ring fails **2.4.7 Focus Visible**; a focus indicator hidden behind a sticky header fails **2.4.11 Focus Not Obscured**.
- Does Tab order follow the visual order? Out-of-order traversal fails **2.4.3 Focus Order**.
- Do Escape and click-outside behave predictably during an edit, and is it obvious whether that saves or discards?

## Names, roles, and structure

- Every control has an accessible name that says what it does. An icon-only button with no `aria-label` fails **4.1.2 Name, Role, Value**. In Playwright this shows up directly: if `getByRole('button', { name: 'Delete' })` cannot find it, a screen reader user cannot either.
- The visible label text is part of the accessible name — **2.5.3 Label in Name**.
- Form fields have real labels — **3.3.2 Labels or Instructions**.
- Headings are used in order and describe the sections — **1.3.1 Info and Relationships**, **2.4.6 Headings and Labels**.
- Errors are announced and identified in text, not by color alone — **3.3.1 Error Identification**, **1.4.1 Use of Color**.
- Images convey their meaning in text — **1.1.1 Non-text Content**.

## Visual

- Text contrast at least 4.5:1, or 3:1 for large text — **1.4.3 Contrast (Minimum)**.
- Interactive controls and focus indicators contrast at least 3:1 against their background — **1.4.11 Non-text Contrast**.
- Zoom to 200% and to a 320px-wide viewport: no loss of content or horizontal scrolling — **1.4.4 Resize Text**, **1.4.10 Reflow**.
- Targets at least 24×24 CSS pixels, or adequately spaced — **2.5.8 Target Size (Minimum)**.
- Content stays usable when the user overrides text spacing — **1.4.12 Text Spacing**.

## Discoverability

Hover-only affordances (a delete "x" that appears only on hover) are invisible to keyboard and touch users. Report them against **2.1.1** where the action is unreachable, and as a usability finding where it is merely hidden.

## Reporting

File findings with the `writing-bug-reports` skill's format, citing the criterion number in **Expected** and naming who is affected in **Impact** ("a keyboard-only user cannot delete an item at all" is a different severity from "a sighted mouse user has to hunt for the control"). Automated checks catch a minority of issues — say clearly what you verified by hand and what remains unverified, such as behavior with an actual screen reader.
