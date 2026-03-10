## PR-Specific Rules

### xstate PRs
- When a PR includes xstate state machines, the PR description MUST include a Mermaid `stateDiagram-v2` visualization of the machine's states and transitions
- Generate the diagram from the machine definition - show states, events, guards, and error/retry flows
- This serves as living documentation for both product and engineering reviewers
