# Devin subagents — Critical Hit QA

The same team as `.claude/agents/`, in the format Devin CLI / Devin Local discovers (`.devin/agents/<name>.md`). Cloud Devin sessions do not read these; they read `.agents/skills/` and `.devin/rules/`.

Ported verbatim from the Claude versions, with two differences forced by the format:

- The Claude-only `tools:` frontmatter key is dropped — its values name Claude Code tools.
- Because that key was what made the five personas read-only, each persona file now carries an explicit **Read-only** section instead. Keep it there; a reviewer who can edit what they review stops being a reviewer.

Everything else — roles, cooperation flow, persona rules, invocation guidance — is documented once in [`../../.claude/agents/README.md`](../../.claude/agents/README.md). Edit both copies of an agent when you change one, or the two surfaces will drift.

The procedures the QA roles rely on live in `.agents/skills/`, and the project constraints in `.devin/rules/team-and-constraints.md`.
