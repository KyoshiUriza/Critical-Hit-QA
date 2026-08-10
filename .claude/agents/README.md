# QA Prep Hub — Sub-agent team

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
