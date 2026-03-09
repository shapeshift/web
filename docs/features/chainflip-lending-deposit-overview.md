# Chainflip Lending - Deposit to State Chain (Product Overview)

This document covers the first functional flow of the Chainflip lending PoC: depositing assets into the Chainflip State Chain, including one-time account creation setup.

## High Level Concepts

### The EVM Account as Identifier

Your Ethereum address IS your Chainflip lending identity. It's mandatory - you cannot use a Bitcoin, Solana, or any other chain address as your account identifier. The ETH address deterministically maps to a Chainflip State Chain account via left-padding + SS58 encoding (prefix 2112).

For this PoC:
- ETH address: `0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986`
- State Chain account: `cFHsUq1uK5opJudRDd194A6JcRQNyhKtXNMRrMgNLV3izEw4P`

Keep in mind: **you do not need to connect the wallet that holds the funds**. For now the PoC doesn't surface this, but the architecture is evolutive enough that supporting e.g. connecting an EVM wallet only or a Ledger with just ETH accounts and depositing from e.g. QR code is definitely an option we can and should think about. This holds true for the deposit flow below, and also for all other flows in subsequent docs.

### Three Fund Buckets

Once assets are on the Chainflip State Chain, they exist in one of three separate buckets:

```
                     +-----------------+
On-Chain Wallet ---> | Free Balance    | <--- Where deposits land
                     +-----------------+
                           |         |
                           v         v
                     +----------+ +-------------+
                     | Supplied | | Collateral  |
                     | (Earn)   | | (Borrow)    |
                     +----------+ +-------------+
```

- **Free Balance**: Unallocated funds sitting on the State Chain. This is where all deposits land. Can be egressed (withdrawn) back to an on-chain wallet at any time.
- **Supplied**: Funds allocated to a lending pool via `add_lender_funds`. These earn interest from borrowers. Cannot be used as collateral.
- **Collateral**: Funds backing a loan via `add_collateral`. These secure your borrow position. Cannot earn supply interest.

These buckets are **fully separate** - supplied funds can't be used as collateral and vice versa. Moving between them requires explicit operations (withdraw from supply to free balance, then add to collateral).

### What FLIP Is and Why You Need It

FLIP is Chainflip's native token (ERC-20 on Ethereum: `0x826180541412d574cf1336d22c0c0a287822678a`). Every State Chain extrinsic (lending operation, deposit channel request, etc.) costs a small amount of FLIP as gas. Think of it like ETH for Ethereum transactions, but for the Chainflip State Chain.

For the PoC, the user explicitly funds their State Chain account with 2 FLIP via the Gateway contract. This is a one-time operation - 2 FLIP is enough for hundreds of lending operations.

In the future, a broker path could auto-swap a portion of the first deposit into FLIP, removing this UX friction entirely.

## Deposit to State Chain Flow

### Overview

The deposit flow takes assets from the user's on-chain wallet and lands them in their State Chain **free balance**. For first-time users, this flow also handles all one-time account setup (FLIP funding, LP registration, refund address).

### xstate Machine: `depositMachine`

```
                                    +-------+
                                    | input |
                                    +---+---+
                                        |
                          SUBMIT_INPUT  |
                     +------------------+------------------+
                     | (needs refund    |                  |
                     |  address?)       | (has it)         |
                     v                  v                  |
              +------+----------+   +--+-----+            |
              | refund_address_ |-->| confirm |            |
              | input           |   +--+-----+            |
              +-----------------+      |                  |
                                       | START            |
                                       v                  |
                              +--------+--------+         |
                              | checking_account |         |
                              +--------+--------+         |
                                       |                  |
               (conditional steps based on account state) |
                     |         |         |         |      |
                     v         v         v         v      |
              +------+--+ +---+----+ +--+----+ +--+----+ |
              |approving | |funding | |regist-| |setting| |
              |  flip    | |account | |ering  | |refund | |
              |(ERC-20   | |(2 FLIP | |(LP    | |address| |
              | approve) | | to SC) | | role) | |       | |
              +------+---+ +---+----+ +--+----+ +--+----+ |
                     |         |         |         |      |
                     +----+----+----+----+         |      |
                          |              |         |      |
                          v              v         v      |
                   +------+------+  +----+----+           |
                   |opening_     |  |         |           |
                   |channel      |  |         |           |
                   +------+------+  |  error  |           |
                          |         |         |           |
                          v         +----+----+           |
                   +------+------+       |                |
                   |sending_     |       | RETRY          |
                   |deposit      |       | (routes back   |
                   +------+------+       |  to failed     |
                          |              |  step)         |
                          v              |                |
                   +------+------+       |                |
                   |confirming   |-------+                |
                   +------+------+                        |
                          |                               |
                          v                               |
                   +------+------+                        |
                   |  success    |--- DONE -------------->+
                   +-------------+
```

### Step-by-Step Protocol Flow

#### Step 1: Approve FLIP (conditional - only if allowance insufficient)

**What**: ERC-20 `approve()` for the FLIP token on the State Chain Gateway contract.

**Why**: The Gateway contract needs permission to move FLIP from the user's wallet.

**Protocol**: Standard ERC-20 approval on Ethereum. The Gateway contract address is `0x6995ab7c4d7f4b03f467cf4c8e920427d9621dbd`.

**Skipped if**: User's FLIP allowance already covers the funding amount (2 FLIP).

#### Step 2: Fund State Chain Account (conditional - only if not funded)

**What**: Call `fundStateChainAccount(nodeID, amount)` on the State Chain Gateway contract.

**Why**: The State Chain account needs FLIP to pay for extrinsic fees. This is an EVM transaction on Ethereum mainnet.

**Protocol**: The `nodeID` is derived from the user's ETH address (left-padded to 32 bytes). The amount is 2 FLIP (2e18 base units). Once the Chainflip validators witness this EVM transaction, the FLIP balance appears on the State Chain.

**Skipped if**: Account already has FLIP balance on the State Chain.

#### Step 3: Register LP Account (conditional - only if not registered)

**What**: Submit `liquidityProvider.registerLpAccount()` extrinsic via EIP-712 Non-Native Signed Call.

**Why**: The account needs the "liquidity_provider" role to interact with lending. This is a one-time registration.

**Protocol**: SCALE-encode the call (pallet 31, call 2) -> `cf_encode_non_native_call` RPC returns EIP-712 typed data -> user signs with `eth_signTypedData_v4` -> submit via `author_submitExtrinsic`.

**Skipped if**: Account role is already `liquidity_provider`.

#### Step 4: Set Refund Address (conditional - only if not set for this chain)

**What**: Submit `liquidityProvider.registerLiquidityRefundAddress(chain, address)` extrinsic.

**Why**: Chainflip needs to know where to send funds back if something goes wrong (e.g., deposit channel expires). One-time per chain.

**Protocol**: Same EIP-712 flow as Step 3. Nonce is incremented from the previous step if both execute in the same session.

**Skipped if**: Refund address already registered for the deposit asset's chain.

#### Step 5: Open Deposit Channel

**What**: Submit `liquidityProvider.requestLiquidityDepositAddress(asset, boostFee)` extrinsic.

**Why**: Creates a temporary deposit address on the target chain where the user sends their assets. Chainflip validators watch this address and credit the State Chain free balance once witnessed.

**Protocol**: Same EIP-712 flow. Returns a `LiquidityDepositAddressReady` event with the deposit address. The channel expires after ~24 hours.

#### Step 6: Send Deposit

**What**: Standard on-chain transfer to the deposit address from Step 5.

**Why**: This is the actual asset movement - BTC goes to a BTC address, ETH to an ETH address, etc.

**Protocol**: This is a regular blockchain transaction on the asset's native chain (e.g., an Ethereum ETH transfer, a Bitcoin UTXO spend). The deposit address is a Chainflip-controlled address specific to this channel.

#### Step 7: Confirming

**What**: Poll `cf_free_balances` until the deposited amount appears.

**Why**: Chainflip validators need to witness the on-chain deposit and credit the State Chain. This typically takes a few block confirmations on the source chain plus Chainflip's witnessing delay.

**Protocol**: The app polls the `cf_free_balances` RPC every ~6 seconds, comparing against the initial free balance captured at the start of the flow. Once the balance increases by the deposited amount, the deposit is confirmed.

### First-Time vs Returning User

For a **first-time user**, all 7 steps execute sequentially. The `checking_account` state evaluates guards in order:
1. `needsApproval` - does FLIP allowance cover 2 FLIP?
2. `needsFunding` - is the State Chain account funded?
3. `needsRegistration` - is the account registered as LP?
4. `needsRefundAddress` - is a refund address set for this chain?

For a **returning user** who already has an account set up, the machine skips directly from `checking_account` to `opening_channel`, making it a 3-step flow: open channel, send deposit, confirm.

### Nonce Management

State Chain operations use an incrementing nonce. The deposit machine tracks `lastUsedNonce` in context, passing `nonce + 1` for each subsequent EIP-712 call within the same session. This allows Steps 3, 4, and 5 to execute without waiting for previous nonces to finalize on-chain (future nonces enter the txpool with a dependency).

### Error Handling

Every step can fail independently. The machine tracks `errorStep` so that RETRY routes back to exactly the step that failed, preserving all progress from earlier steps. The user can also BACK out to the input screen and start over.

## Live Account Data (March 2026)

Current state of the PoC test account (`0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986`):

| Field | Value |
|-------|-------|
| State Chain Account | `cFHsUq1uK5opJudRDd194A6JcRQNyhKtXNMRrMgNLV3izEw4P` |
| Role | `liquidity_provider` |
| FLIP Balance | ~4.0 FLIP |
| ETH Free Balance | ~0.011 ETH |
| USDC Free Balance | ~74.88 USDC |
| USDC Collateral | ~156.43 USDC |
| Active Loan | #126 (USDC, ~101.07 principal) |
| Current LTV | ~64.65% |
| Refund Addresses | Ethereum, Solana |

## Runtime & Environment

| Field | Value |
|-------|-------|
| Runtime | chainflip-node specVersion 20012, txVersion 13 |
| RPC | `rpc.mainnet.chainflip.io` (public, no auth) |
| Gateway Contract | `0x6995ab7c4d7f4b03f467cf4c8e920427d9621dbd` |
| FLIP Token | `0x826180541412d574cf1336d22c0c0a287822678a` |
| FLIP Funding Amount | 2 FLIP |
| SS58 Prefix | 2112 |
| EIP-712 Domain | `{ name: "Chainflip-Mainnet", version: "20012" }` |

## Deposit Channel Minimums (live from `cf_environment`)

| Chain | Asset | Minimum Deposit |
|-------|-------|----------------|
| Ethereum | ETH | 0.01 ETH |
| Ethereum | FLIP | 4 FLIP |
| Ethereum | USDC | 20 USDC |
| Ethereum | USDT | 20 USDT |
| Bitcoin | BTC | 0.0004 BTC |
| Polkadot | DOT | 4 DOT |
| Arbitrum | ETH | ~0.004 ETH |
| Arbitrum | USDC | 10 USDC |
| Solana | SOL | ~0.068 SOL |
| Solana | USDC | 10 USDC |
| Assethub | DOT | 4 DOT |
| Assethub | USDT | 20 USDT |
| Assethub | USDC | 20 USDC |

## Notes

- The deposit into state channel flow above encapsulates everything in a single stepper, but technically you could separate these into independent flows (e.g. register refund address separately, fund account as its own flow, or only show the last 3 steps for returning users).
- The 2 FLIP funding step is a current hard requirement for the direct path. If/when the Chainflip BaaS broker exposes `request_account_creation_deposit_address`, a broker path can auto-swap a portion of the first deposit to FLIP, removing this friction.
- All signing happens via EIP-712 `eth_signTypedData_v4` - the same mechanism used for CowSwap Permit2 orders. Users sign a human-readable message, not a raw hex blob.
