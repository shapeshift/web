# Chain Integration Full YOLO E2E Crew

This skill orchestrates a complete end-to-end blockchain integration using a "crew" model with specialized agents working in parallel.

## When to Use This Skill

When a user says they want to integrate a new chain (e.g., "I want to integrate X chain"), ask them:

> Would you like to use:
> 1. **Regular chain-integration skill** - Step-by-step guided integration
> 2. **Chain Integration Crew (Full YOLO E2E)** - Spawns a crew of specialized agents for complete integration including native wallet, Ledger, Trezor, and swapper support

## Crew Structure

The crew operates with the following agent hierarchy:

### Master Agent (Chief)
- Coordinates all work across the crew
- Writes master documentation (`{CHAIN}_CHAIN_INTEGRATION_MASTER.md`)
- Performs final sanity checks
- Runs verdaccio publish pipeline for hdwallet changes
- Handles final lint, type-check, test, commit, push

### Research Agent (Phase 1 - Always First)
Before any implementation begins, spawn a research agent to:
- Investigate the chain's specifications (SLIP-44 coin type, derivation path, address format)
- Check Ledger support (`@ledgerhq/hw-app-{chain}` or similar)
- Check Trezor support (`@trezor/connect` methods)
- Check existing swapper support (DEX aggregators, bridges)
- Review chain documentation and specs
- Identify any gotchas or special requirements

### Native Agent
- Implements base chain support in `hdwallet-native`
- Key derivation (BIP44/SLIP-0010)
- Address generation
- Transaction signing
- This is the foundation - must be tested before Ledger/Trezor

### Ledger Agent (if supported)
- Implements chain support in `hdwallet-ledger`
- Adds hw-app dependency if needed
- Updates transport.ts, ledger.ts, utils.ts
- Updates web-side Ledger integration (ledgerAppGate, constants)

### Trezor Agent (if supported)
- Implements chain support in `hdwallet-trezor`
- Updates trezor.ts with wallet interfaces
- Web-side integration is usually automatic via `_supports{Chain}` check

### Chain Integration Agent
- Leverages the existing `chain-integration` skill
- Handles ChainAdapter, CAIP constants, feature flags
- Web-side chain support (portfolio, send, receive)

### Swapper Agent (if applicable)
- Leverages the existing `swapper-integration` skill
- Implements swapper support for the new chain
- Quote fetching, transaction building, status tracking

## Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: RESEARCH                            │
│  Research Agent explores specs, docs, hw support                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 2: HDWALLET                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Native    │  │   Ledger    │  │   Trezor    │  (parallel) │
│  │   Agent     │  │   Agent     │  │   Agent     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 3: VERDACCIO                           │
│  Master Agent runs hdwallet-verdaccio-local-publish-pipeline    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 4: WEB INTEGRATION                     │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Chain Integration│  │ Swapper Integration│  (parallel)      │
│  │      Agent       │  │      Agent        │                   │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 5: FINALIZATION                        │
│  Master Agent: sanity check, lint, type-check, test, commit     │
└─────────────────────────────────────────────────────────────────┘
```

## Master Documentation Template

Create `{CHAIN}_CHAIN_INTEGRATION_MASTER.md` in the web repo root with:

```markdown
# {CHAIN} Chain Integration - Master Documentation

## Crew Overview
[Document the crew structure and who did what]

### Crew Structure
- **Master Agent (Chief)**: Coordinates all work, writes master documentation
- **Research Agent**: Initial research phase, specs, hw support investigation
- **Native Agent**: Base hdwallet-native implementation
- **Ledger Agent**: Ledger hardware wallet support (if applicable)
- **Trezor Agent**: Trezor hardware wallet support (if applicable)
- **Chain Integration Agent**: Web-side chain adapter and integration
- **Swapper Agent**: Swapper/DEX support (if applicable)

## Implementation Summary
[Technical details of what was implemented]

## Chain Specifications
- Chain Namespace:
- Chain Reference:
- Chain ID:
- SLIP-44 Coin Type:
- Derivation Path:
- Address Format:

## Files Modified
[List all files modified across hdwallet and web repos]

## Environment Variables
[List any new env vars added]

## Testing Checklist
[Checklist for manual testing]

## Changelog
[Session-by-session changelog]
```

## Spawning Agents

Use the Task tool with appropriate subagent_type:

```
# Research phase
Task(subagent_type="Explore", prompt="Research {CHAIN} chain specs, Ledger/Trezor support...")

# Native implementation
Task(subagent_type="general-purpose", prompt="Implement {CHAIN} support in hdwallet-native...")

# Ledger implementation (parallel with Trezor)
Task(subagent_type="general-purpose", prompt="Implement {CHAIN} Ledger support in hdwallet-ledger...")

# Trezor implementation (parallel with Ledger)
Task(subagent_type="general-purpose", prompt="Implement {CHAIN} Trezor support in hdwallet-trezor...")

# Chain integration
Skill(skill="chain-integration")

# Swapper integration
Skill(skill="swapper-integration")
```

## Important Notes

1. **Research First**: Always run research phase before any implementation
2. **Native Before Hardware**: Native wallet must work before Ledger/Trezor
3. **Parallel Where Possible**: Ledger and Trezor can run in parallel
4. **Verdaccio Required**: hdwallet changes must go through verdaccio pipeline
5. **Documentation**: Each agent should contribute to the master doc
6. **Sanity Checks**: Master agent validates all work at the end

## Prerequisites

- User must have run Claude with `--add-dir` pointing to hdwallet repo
- Verdaccio must be running on `http://127.0.0.1:4873`
- Both repos must be on feature branches

## Example Usage

```
User: I want to integrate Monad chain

Claude: Would you like to use:
1. Regular chain-integration skill - Step-by-step guided integration
2. Chain Integration Crew (Full YOLO E2E) - Spawns a crew for complete integration

User: Let's go with the crew!

Claude: 🚀 Initiating Chain Integration Crew for Monad...

[Phase 1: Research Agent investigates Monad specs]
[Phase 2: Native/Ledger/Trezor agents work on hdwallet]
[Phase 3: Verdaccio publish pipeline]
[Phase 4: Chain/Swapper integration on web]
[Phase 5: Final sanity check and commit]
```
