## Beads Rules

Use `bd` as the default workflow for complex multi-step work.

### Priority
- For complex tasks, always prefer beads tracking before implementation.
- Keep bead status current as work progresses (`in_progress`, then `closed`).
- Keep beads sync in your normal completion flow.

### Commands

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

### Session Completion Integration
- Include beads updates in session completion.
- Before final push, ensure bead state is consistent with delivered work.
