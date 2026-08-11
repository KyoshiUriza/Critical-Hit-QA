# Critical Hit QA — Sub-agent team

A standard agile team, one Claude Code sub-agent per role. Each agent is an expert in their domain, follows current best practices, and knows this project's specific context and constraints.

The main assistant (you, in a normal chat) can delegate to any of these by name. Claude Code will also invoke them automatically when a task matches their `description` (that's why several are marked "Use PROACTIVELY").

## The team

| Agent | Domain | Invoke for |
|---|---|---|
| **[product-owner](product-owner.md)** | Product | Feature proposals, prioritization, user stories, acceptance criteria, roadmap decisions |
| **[scrum-master](scrum-master.md)** | Process | Sprint planning, retros, standup summaries, unblocking, process improvements |
| **[ux-designer](ux-designer.md)** | User experience | User journeys, IA, interaction specs, empty/error/loading states, usability reviews |
| **[ui-designer](ui-designer.md)** | Visual design | Colors, typography, spacing, design tokens, component appearance, dark/light theme, visual polish |
| **[frontend-developer](frontend-developer.md)** | Implementation | HTML/CSS/JS work, new pages/components, refactors, performance, DOM/browser APIs |
| **[qa-engineer](qa-engineer.md)** | Test thinking | Test plans, test cases, exploratory sessions, bug reports, six-lens analysis (pos/neg/boundary/security/a11y/UX) |
| **[automation-engineer](automation-engineer.md)** | Test code | Playwright/Cypress/Selenium spec authoring, Page Objects, flake diagnosis, CI test setup |
| **[security-engineer](security-engineer.md)** | Security | Threat modeling, XSS/injection audit, CSP tuning, dependency review, secret-leak checks |
| **[devops-engineer](devops-engineer.md)** | Delivery | Hosting, CI/CD workflows, deploy strategy, custom domains, monitoring, runbooks |
| **[tech-lead](tech-lead.md)** | Architecture | Cross-cutting decisions, pattern consistency, ADRs, dependency evaluation, arbitration between other agents |

## The user panel

Five personas spanning the audience, from "not yet a tester" to "decides who
gets hired." They are the *users* in user feedback: they react to the product,
they do not build it. All are read-only by design — a reviewer who can edit
the thing they are reviewing stops being a reviewer.

| Agent | Who they are | What only they can tell you |
|---|---|---|
| **[persona-curious](persona-curious.md)** | Priya — support lead wondering if QA is for her, 30-second attention span | Whether the first screen lands or loses people; which words on the entry path are jargon |
| **[persona-new-tester](persona-new-tester.md)** | Marcus — 6 weeks in, course done, 11 applications out | Where beginners stall; whether content teaches *doing* or only *recognizing* |
| **[persona-intermediate-tester](persona-intermediate-tester.md)** | Dana — 2.5yr manual QA moving to automation, studies tired at 9pm | Whether content has practitioner depth or is a rebadged beginner course; what earns a second visit |
| **[persona-senior-qa](persona-senior-qa.md)** | Tomasz — 11yr senior, interviews monthly, checking the site for a mentee | Whether the content is *correct*; what a junior who learned here would need un-teaching |
| **[persona-qa-lead](persona-qa-lead.md)** | Amara — hires and runs a team of 9, reviews candidate portfolios | Whether the exports impress the person who reads them; whether "prepared here" is a signal or a flag |

Three rules keep the panel honest:

1. **Personas report observations, not designs.** "I didn't know what Bug
   Bounty meant so I skipped it" — the fix belongs to UX/UI/product.
2. **Each stays in their lane on expertise.** The curious persona never looks
   up a term; the beginner never performs skill they lack; the lead defers to
   the senior on accuracy, and the senior defers to the beginner on what
   beginners find obvious. A persona breaking character is worthless.
3. **Accuracy outranks preference.** When persona-senior-qa confirms an error,
   it is a defect, not one voice among five.

### The feedback loop

```
persona panel (any or all five, in parallel — they are independent)
   ↓  observations: where they stalled, left, doubted, or were misled
product-owner        → turns observations into stories, priorities, or "no"
   ↓
ux-designer          → fixes the paths where personas got lost
ui-designer          → fixes what personas missed or misread
   ↓
engineering agents   → build it
   ↓
persona panel again  → did the fix land for the persona who raised it?
```

The last step matters: the persona who raised a finding re-reviews the fix.
A fix that satisfies the team but not the persona is not a fix.

### Picking reviewers

- Landing page, naming, first-run → **curious + new-tester**
- Learn content, exercises, hints → **new-tester + intermediate + senior** (ramp, depth, accuracy)
- Quiz banks, model answers, code samples → **senior** first, always
- Portfolio, exports, interview prep → **qa-lead + intermediate**
- "Should we build X?" → **product-owner**, informed by whichever personas X claims to serve
- Full review → all five in parallel, then product-owner synthesises

## How the roles cooperate

The team is designed so responsibilities don't overlap, but every real feature touches several of them. A typical flow:

```
product-owner        → user story + acceptance criteria
   ↓
ux-designer          → journey, states, interaction spec
   ↓
ui-designer          → visual spec, design system delta
   ↓
tech-lead            → architectural review (does it fit patterns?)
   ↓
frontend-developer   → implementation
   ↓
qa-engineer          → test cases (six lenses)
   ↓
automation-engineer  → automated tests
   ↓
security-engineer    → pre-release audit
   ↓
devops-engineer      → ship it
```

For small changes, skip the roles that don't apply — this is a lean team, not a bureaucracy.

## Two rules the agents share

1. **Every agent knows the project constraints:**
   - 100% static site. No backend. No accounts. localStorage per browser.
   - Zero npm dependencies. Zero CDN scripts. Zero external assets.
   - Every practice-app interactive element exposes a stable `data-testid`.
   - Themed on *The Convergence Chronicles: The Resonance Lattice*.
2. **Every agent refuses "just this one time" exceptions to those constraints.** If breaking one is genuinely necessary, they surface it as an explicit trade-off — never a silent addition.

## Invoking an agent

### From a chat prompt
Ask directly:
> "Have the security-engineer audit the file-upload page."
> "Ask the product-owner if we should add flashcards to MVP."
> "Get the qa-engineer to design test cases for the modal dialog."

### Automatically
Agents with "Use PROACTIVELY" in their description will be invoked without an explicit ask when the task matches. For example, propose a new feature and the product-owner should surface itself; propose HTML changes and the frontend-developer should engage.

### Parallel work
When multiple agents can work independently, they run in parallel — for example, ux-designer and ui-designer reviewing the same feature simultaneously.

## Modifying the team

- Edit any `.md` in this directory to change a role's mandate, best practices, or refusals.
- Add a new `.md` here to introduce a new role (data-engineer, tech-writer, mobile-dev, etc.).
- Remove one to retire a role.

Each file's frontmatter fields:
- `name` — kebab-case, matches filename.
- `description` — the invocation heuristic; be specific about triggers.
- `tools` — comma-separated list of Claude Code tools the agent can use.
- Optional: `model: opus` or similar to override the default.
