# Yield.xyz API Documentation - Comprehensive Analysis

## Overview

**Yield.xyz** is the most complete API for integrating non-custodial, on-chain yield — including staking, restaking, liquid staking, DeFi lending, RWA yields, vaults, and more across 80+ blockchain networks.

Originally developed as the backbone of [Omni](https://omni.app), one of the most advanced staking wallets in Web3, our infrastructure has been refined through years of production use and real-world feedback. Today, it powers Yield.xyz — the trusted yield layer behind platforms like **Ledger, Zerion, and Tangem**, serving **4M+ users** and supporting **hundreds of millions in monthly volume**.

---

## Core Design Principles

### Self-Custody by Design
- API **constructs** complete transaction flows but **never executes** them
- Transactions are returned fully constructed for **your** signing infrastructure
- Compatible with:
  - Browser wallets (MetaMask, Phantom, Rabby)
  - Hardware wallets (Ledger, Trezor)
  - Institutional custody platforms
  - Smart contract wallets (Safe, Stackup, Kernel)
  - Custom MPC flows

### Unified Interface
- Single schema-based format for metadata, actions, and balances
- No chain-specific SDKs required
- Instant integration across all supported protocols
- 80% DeFi market coverage

### Schema-First Design
- All inputs defined in schemas for dynamic UI generation
- No hardcoding validator dropdowns, amount fields, or chain-specific logic
- Frontend forms generated directly from API schemas

---

## Authentication & API Access

### Obtaining an API Key
1. **Access Admin Dashboard**: https://dashboard.stakek.it/
2. **Create a project** (keys are handled at project level)
3. **Generate API key** within the project

### Authentication Method
- **Header**: `X-API-KEY: <YOUR_API_KEY>`

### Example Request
```bash
curl https://api.yield.xyz/v1/yields \
  -H "X-API-KEY: <YOUR_API_KEY>"
```

### Contact for API Access
- Email: hello@yield.xyz
- Partners get dedicated Slack/Telegram channels

### Base URL
```
https://api.yield.xyz/v1
```

---

## Rate Limits & Plans

| Plan | Rate Limit | OAV Limit | Description |
|------|------------|-----------|-------------|
| **Trial** | 1 req/sec | 3 OAVs | Perfect for testing, prototypes, early-stage integrations |
| **Standard** | 100 req/sec | 10 OAVs | Built for live apps, wallets, production-ready tools |
| **Pro** | 1,000+ req/sec | Unlimited | Ideal for high-volume apps, yield platforms, infrastructure teams |

**Contact**: hello@yield.xyz to upgrade

---

## Supported Networks (80+)

### EVM Networks

**Mainnets**:
- Ethereum
- Arbitrum
- Avalanche
- Base
- BNB Chain (BSC)
- Celo
- CoreDAO
- Cronos
- Gnosis
- Harmony
- HyperEVM / Hyperliquid
- Linea
- Optimism
- Polygon (MATIC)
- Sonic
- Unichain
- Viction

**Testnets**:
- Base-Sepolia
- Ethereum-Goerli (deprecated)
- Ethereum-Holesky
- Ethereum-Sepolia
- Ethereum-Hoodi
- Polygon-Amoy

### Cosmos Ecosystem (40+ chains)
- Cosmos (ATOM)
- Osmosis (OSMO)
- Injective (INJ)
- dYdX
- Juno (JUNO)
- Secret (SCRT)
- Stargaze (STARS)
- Sommelier (SOMM)
- Axelar (AXL)
- Band Protocol (BAND)
- Fetch.ai (FET)
- Kava (KAVA)
- Crescent (CRE)
- Chihuahua (HUAHUA)
- Comdex (CMDX)
- Quicksilver (QCK)
- Regen (REGEN)
- Irisnet (IRIS)
- Persistence (XPRT)
- Umee (UMEE)
- Mars Protocol
- Agoric (BLD)
- Akash (AKT)
- Ki Network (XKI)
- Onomy (NOM)
- Teritori (TORI)
- And 20+ more Cosmos SDK chains

### Non-EVM Non-Cosmos
- **Solana (SOL)** - Multi-validator support
- **Tezos (XTZ)**
- **Cardano (ADA)**
- **Polkadot (DOT)** - Validator staking + Pooled
- **Kusama (KSM)**
- **NEAR (NEAR)**
- **TON** - Nomination pools, TonWhales, Chorus One, Tonstakers
- **Bittensor (TAO)**
- **Celestia (TIA)**
- **Dymension (DYM)**
- **Saga (AGA)**
- **Desmos (DSM)**
- **CryptoOrg (CRO)**
- **HumansAI (HUMANS)**
- And more

**Testnets**: Solana Devnet, Ton-Testnet, Westend (Polkadot)

---

## Supported Yield Types

### 1. Staking Yields

#### Native Staking (EVM)
| Network | Token | Notes |
|---------|-------|-------|
| Ethereum | ETH | Via multiple providers (Everstake, Figment, InfStones, Luganodes, P2P, Stakewise V3) |
| Avalanche | AVAX | Native staking |
| BNB Chain | BNB | Native staking |
| Polygon | MATIC/POL | Native staking |
| CoreDAO | CORE | Native staking |
| Celo | CELO | Native staking |
| Harmony | ONE | Native staking |
| Tron | TRX | Native staking |
| Hyperliquid | HYPE | Native staking |
| Monad | MON | Native staking |
| Sonic | S | Native staking |
| The Graph | GRT | On Arbitrum and Ethereum |
| Synthetix | SNX | 420 Pool on Ethereum |

#### Native Staking (Non-EVM Cosmos)
40+ Cosmos SDK chains with native delegation to validators

#### Native Staking (Other)
- Solana (SOL) - Multi-validator
- Tezos (XTZ)
- Cardano (ADA)
- Polkadot (DOT)
- Kusama (KSM)
- NEAR (NEAR)
- TON

#### Liquid Staking
| Provider | Token | Networks |
|----------|-------|----------|
| Lido | stETH, stMATIC | Ethereum, Polygon |
| RocketPool | rETH | Ethereum |
| Benqi | avETH | Avalanche |
| JustLend | stTRX | Tron |
| Tonstakers | tSTON | TON |
| Stakewise V3 | sETH2 | Ethereum |

#### Restaking
| Provider | Token | Network |
|----------|-------|---------|
| EigenLayer | eigenETH/ETH | Ethereum |
| EtherFi | eETH/ETH | Ethereum |
| Renzo | ezETH/ETH | Ethereum |
| KelpDAO | rsETH/ETH | Ethereum |

---

### 2. DeFi Yields (80% Market Coverage)

#### Lending Protocols
| Protocol | Type | Networks |
|----------|------|----------|
| **Aave V3** | Lending | Ethereum, Base, Polygon, Arbitrum, Optimism, Avalanche, BNB Chain |
| **Compound V3** | Lending | Ethereum, Base, Polygon, Arbitrum |
| **Spark** | Lending | Ethereum, Base |
| **Fluid** | Lending | Ethereum, Base, Arbitrum, Plasma |
| **Gearbox** | Lending | Ethereum, Arbitrum, Optimism |
| **Drift** | Lending | Solana |
| **Venus** | Lending | BNB Chain |
| **Morpho - Aave** | Lending | Multiple EVM |
| **Morpho - Compound** | Lending | Multiple EVM |
| **Blend** | Lending | - |

#### Vault Strategies
| Protocol | Type | Notes |
|----------|------|-------|
| **Yearn V2/V3** | Vaults | Auto-compounding strategies |
| **Morpho** | Vaults | Yield optimization |
| **Sky (formerly Spark)** | Vaults | Savings |
| **Ethena** | Vaults | USDe stablecoin |
| **Maple Finance** | Vaults | Institutional lending |
| **Sommelier** | Vaults | Multi-strategy |
| **Euler** | Vaults | Lending vault |
| **Angle Protocol** | Vaults | Stablecoin vault |
| **Idle Finance** | Vaults | Yield optimization |
| **Yo Protocol** | Vaults | Base chain |

#### Liquid Staking/Restaking
| Provider | Token | Notes |
|----------|-------|-------|
| Lido | stETH | Largest liquid staking |
| RocketPool | rETH | Decentralized |
| Renzo | ezETH | Restaking |
| EtherFi | eETH | Restaking |
| KelpDAO | rsETH | Restaking |

---

### 3. Stablecoin Yields (200+ Strategies)

#### Supported Protocols & Chains
| Protocol | Supported Chains | Stablecoins |
|----------|-----------------|-------------|
| **Aave** | Ethereum, Base, Polygon, Arbitrum, Optimism, Avalanche, BNB, Plasma | USDC, USDT, DAI, EURC, USDS, USDe, GHO, crvUSD, PYUSD, LUSD, RLUSD, AUSD, sUSD |
| **Compound** | Ethereum, Base, Polygon, Arbitrum | USDC, USDT, USDS, USDe |
| **Morpho** | Arbitrum, Ethereum, Base, Plasma, Optimism | USDC, USDT, eUSD, EURC, EURA, USDA, crvUSD, PYUSD, AUSD, RLUSD |
| **Spark** | Ethereum, Base | USDC, USDT, USDS, DAI |
| **Ethena** | Ethereum | USDe |
| **Maple** | Ethereum | USDC, USDT |
| **Yearn** | Ethereum, Optimism, Arbitrum | USDC, USDT, crvUSD, DAI, USDS, LUSD, MIM, TUSD |
| **Fluid** | Ethereum, Base, Arbitrum, Plasma | USDC, USDT, GHO, EURC |
| **Gearbox** | Ethereum, Arbitrum, Optimism | USDC, USDT, DAI, GHO, crvUSD |
| **Kamino** | Solana | USDC, USDT, USDS, EURC, PYUSD, USDe |
| **Drift** | Solana | USDC, USDT, USDS, USDe, PYUSD, AUSD |
| **Angle** | Ethereum, Arbitrum, Optimism, Polygon | EURC, EURA, USDA |
| **Idle Finance** | Ethereum | USDC, USDe |
| **Venus** | BNB Chain | BUSD, USDC, USDT |
| **Upshift** | Ethereum, Monad, Plasma | USDC |
| **Curve** | Ethereum | crvUSD |
| **Yo** | Base | USDC |

#### Integration Options for Stablecoins

**Option 1: Base Stablecoin Yields (Plain Vanilla)**
- Users interact directly with underlying DeFi protocols
- No fees charged to user
- Ideal for straightforward, no-friction integration
- Zero complexity: no vault deployment required

**Option 2: Optimized Allocator Vaults (OAVs)**
- Fully customizable vaults built on OAV infrastructure
- Single-strategy or multi-strategy stablecoin vaults
- Unlock monetization through configurable fees
- Automate workflows: wrapping, swapping, bridging, off-ramping, compounding

---

### 4. DEXs & Providing Liquidity

| Protocol | Type | Notes |
|----------|------|-------|
| **Curve** | DEX/LP | Stablecoin and crypto pools |
| **PancakeSwap V3** | DEX/LP | BNB Chain |

---

## Fee Structure

Yield.xyz enables partners to monetize through **three fee types**, configured per yield opportunity.

### 1. Deposit Fees
- **Range**: 0.2% - 0.8%
- **Timing**: Applied at point of deposit
- **Mechanism**:
  - **EVM chains**: FeeWrapper smart contracts (ERC-4626 compliant)
  - **Non-EVM chains**: Atomic fee transfer mechanisms
- **DeFi Composability**: ✅ Preserved (users receive exact receipt assets)
- **Use Case**: Ideal for liquid staking assets and composable strategies

**Chain-Specific Implementation**:
- **Solana**: Additional program instruction for fee transfer (atomic)
- **Cosmos**: Additional proto message (MsgSend) bundled with delegation
- **TON**: Additional cell bundled in transaction (up to 4 messages)
- **Cardano**: Transaction output bundled with delegation certificate
- **Tron**: Separate transaction (non-atomic) - requires additional step
- **EVM**: FeeWrapper contract handles atomic fee deduction

**Audit**: FeeWrapper contracts audited by Zellic
**Demo Deployment**: https://etherscan.io/address/0xb32d6e11ee9e13db1a2ceec071feb7ece1d255c1

### 2. Performance Fees
- **Range**: 10% - 30% (20% is industry standard)
- **Timing**: Applied at harvest (when rewards are realized)
- **Mechanism**: ERC-4626 Allocator Vaults
- **DeFi Composability**: ❌ Limited
- **Use Case**: High-yield products where fee percentages are higher

**How It Works**:
- Vault computes profit since last harvest
- Fee only charged on gains (not principal)
- Fees accumulate until harvested
- Minted as new vault shares to fee recipient

### 3. Management Fees
- **Range**: 1% - 5% annually (2% is industry standard)
- **Timing**: Annualized, applied at harvest
- **Mechanism**: ERC-4626 Allocator Vaults
- **DeFi Composability**: ❌ Limited
- **Use Case**: Long-term strategies, stablecoin yields

**How It Works**:
- Continuously accrues as percentage of total AUM
- Calculated based on elapsed time since last harvest
- Applied even without positive returns
- Mints new vault shares proportionally

### Fee Configuration
All monetization options are declared in `possibleFeeTakingMechanisms` metadata and automatically embedded into transaction logic.

---

## API Endpoints

### Discovery Endpoints

#### `GET /v1/yields`
List all yield opportunities.

**Parameters**:
- `network` (optional): Filter by network ID
- `token` (optional): Filter by token symbol
- `inputToken` (optional): Filter by accepted input token
- `provider` (optional): Filter by protocol/provider

**Response**: `YieldDto[]`

**Response Fields**:
```typescript
{
  id: string;           // Canonical yield identifier
  network: string;      // Chain ID (e.g., "ethereum")
  token: TokenDto;      // Underlying token (e.g., ETH)
  inputTokens: TokenDto[];  // Accepted tokens for entering
  outputToken?: TokenDto;   // What user receives (e.g., stETH)
  status: {
    enter: boolean;     // Whether entering is available
    exit: boolean;      // Whether exiting is available
  };
  metadata: {
    name: string;
    description: string;
    logoURI: string;
    documentationLink?: string;
  };
  rewardRate: {
    total: number;      // Total APY/APR
    rateType: "APR" | "APY";
    components: {       // Breakdown by source
      type: "staking" | "incentive" | "mev" | "points";
      apr: number;
    }[];
  };
  providerId: string;   // Protocol identifier (e.g., "lido", "aave")
  mechanics: {
    arguments: {
      enter: Schema;    // Input schema for enter action
      exit: Schema;     // Input schema for exit action
      balance: Schema;  // Input schema for balance query
    };
    cooldownPeriod?: number;   // Cooldown in seconds
    withdrawPeriod?: number;   // Withdraw period in seconds
    warmupPeriod?: number;     // Warmup period in seconds
    fee?: {
      deposit?: number;        // Deposit fee percentage
      withdrawal?: number;     // Withdrawal fee percentage
      performance?: number;    // Performance fee percentage
    };
  };
  entryLimits?: {
    minimum?: string;   // Minimum entry amount
    maximum?: string;   // Maximum entry amount
  };
  validators?: Validator[];  // For validator-based yields
  tags?: string[];     // For categorization
  statistics?: {
    tvl?: string;       // Total value locked
    userCount?: number; // Number of users
    avgPositionSize?: string;
  };
}
```

#### `GET /v1/yields/{yieldId}`
Get metadata for a specific yield opportunity.

#### `GET /v1/yields/{yieldId}/validators`
Get validators for a specific yield.

**Response**:
```typescript
{
  validators: Validator[];
}
```

**Validator Fields**:
```typescript
{
  address: string;
  name: string;
  apr: number;
  commission: number;
  stake?: string;         // Total stake
  logoURI?: string;
  performance?: {         // Performance metrics
    uptime: number;
    avgReturn: number;
  };
}
```

#### `GET /v1/networks`
List all available networks.

**Response**:
```typescript
{
  id: string;             // Network ID (e.g., "ethereum")
  name: string;           // Display name
  category: "evm" | "cosmos" | "substrate" | "other";
  logoURI: string;
}
```

#### `GET /v1/providers`
List all providers.

#### `GET /v1/providers/{providerId}`
Get provider details by ID.

---

### Actions Endpoints

All actions use intent-based pattern with `POST /v1/actions/{intent}`:

#### `POST /v1/actions/enter`
Create a new position (stake, lend, deposit).

**Request Body**:
```typescript
{
  yieldId: string;
  address: string;        // User's wallet address
  arguments: {
    amount: string;       // Amount in base units
    validatorAddress?: string;  // For validator-based yields
    additionalAddresses?: {
      cosmosPubKey?: string;   // For Cosmos chains
      // Other chain-specific fields
    };
  };
  passthrough?: string;   // Optional passthrough data
}
```

**Response**: `ActionDto`
```typescript
{
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  transactions: TransactionDto[];
  metadata: {
    type: "enter" | "exit" | "manage";
    inputAmount: string;
    outputAmount?: string;
    fee?: number;
  };
}
```

#### `POST /v1/actions/exit`
Unwind a position (unstake, withdraw).

**Request Body**:
```typescript
{
  yieldId: string;
  address: string;
  action: "EXIT" | "UNSTAKE" | "WITHDRAW";
  arguments: {
    amount?: string;      // Optional: partial exit
    validatorAddress?: string;
  };
  passthrough: string;    // Required for position-specific actions
}
```

#### `POST /v1/actions/manage`
Follow-up actions (claim, restake, redelegate).

**Request Body**:
```typescript
{
  yieldId: string;
  address: string;
  action: "CLAIM_REWARDS" | "RESTAKE_REWARDS" | "REDELEGATE" | "SWEEP";
  arguments: {
    validatorAddress?: string;   // For redelegation
    // Other action-specific fields
  };
  passthrough: string;    // From pending actions or balances
}
```

**Supported Manage Actions**:
- `CLAIM_REWARDS` - Claim accumulated rewards
- `RESTAKE_REWARDS` - Automatically restake rewards
- `REDELEGATE` - Switch to different validator
- `SWEEP` - Collect all from position
- And others depending on yield type

#### `GET /v1/actions`
List user actions.

**Parameters**:
- `address` (required): Wallet address
- `status` (optional): Filter by status
- `yieldId` (optional): Filter by yield

#### `GET /v1/actions/{actionId}`
Get action details.

---

### Transaction Endpoints

#### `POST /v1/transactions/submit`
Submit a signed transaction.

**Request Body**:
```typescript
{
  actionId: string;
  network: string;
  transaction: {
    to: string;
    data: string;
    value?: string;
    gasLimit?: string;
  };
  signature?: string;     // If not submitted directly
}
```

#### `PUT /v1/transactions/submit-hash`
Submit transaction hash for tracking.

#### `GET /v1/transactions/{transactionId}`
Get transaction details.

**Response**:
```typescript
{
  id: string;
  status: "pending" | "confirmed" | "failed";
  hash?: string;
  network: string;
  blockNumber?: number;
  gasUsed?: string;
  events?: TransactionEvent[];
  explorerUrl?: string;
}
```

---

### Balances Endpoints

#### `GET /v1/yields/{yieldId}/balances?address={wallet}`
Get balances for a specific yield.

**Response**: `BalanceDto[]`

**BalanceDto Fields**:
```typescript
{
  address: string;        // Wallet that owns this position
  yieldId: string;
  type: BalanceType;      // Lifecycle status
  amount: string;         // Formatted value in token units
  amountRaw: string;      // Base unit value
  amountUsd: number;      // Approximate USD value
  token: TokenDto;        // Asset metadata
  validator?: Validator;  // Staking validator (if applicable)
  validators?: Validator[];  // Multiple validators
  pendingActions?: PendingAction[];  // Available follow-ups
  isEarning: boolean;     // Whether position is generating yield
  metadata?: {
    depositedAt?: string;
    lastHarvestAt?: string;
    // Additional position metadata
  };
}
```

**BalanceType Values**:
| State | Description |
|-------|-------------|
| `active` | Currently staked/deployed, earning yield |
| `entering` | Deposit in progress, awaiting confirmation |
| `exiting` | Unstaking or in cooldown |
| `withdrawable` | Ready to withdraw after cooldown |
| `claimable` | Accumulated rewards available |
| `locked` | Subject to vesting/protocol restrictions |

#### `POST /v1/yields/balances`
Get balances across multiple yields and networks (batch query).

**Request Body**:
```typescript
{
  address: string;
  networks?: string[];    // Optional: filter by networks
  yieldIds?: string[];    // Optional: filter by yields
  includeMetadata?: boolean;
}
```

**Response**: `BalanceDto[]`

---

### Pending Actions

Server-detected follow-ups based on position state:

**Common Actions**:
- `CLAIM_REWARDS` - Claim accumulated rewards
- `RESTAKE_REWARDS` - Automatically restake rewards
- `REDELEGATE` - Switch to different validator
- `WITHDRAW` - Withdraw after cooldown
- `UNSTAKE` - Begin unstaking process
- `EXIT` - Full position exit

**PendingAction Fields**:
```typescript
{
  type: string;           // Action type
  passthrough: string;    // Opaque server-generated string (required for execution)
  arguments?: Schema;     // Schema for user input
  metadata?: {
    estimatedAmount?: string;
    fee?: number;
    duration?: number;
  };
}
```

---

## Argument Schemas

All action inputs are schema-driven, defined under `mechanics.arguments`:

### Schema Types
```typescript
{
  type: "string" | "number" | "boolean" | "object" | "array" | "enum";
  required: boolean;
  label: string;          // UI label
  description?: string;   // Help text
  pattern?: string;       // Validation pattern (e.g., regex for addresses)
  minimum?: number;       // Min value
  maximum?: number;       // Max value
  decimals?: number;      // Decimal places
  enumValues?: {          // For enum types
    value: string;
    label: string;
  }[];
  properties?: {          // For object types
    [key: string]: Schema;
  };
  items?: Schema;         // For array types
  ref?: string;           // Reference to dynamic data (e.g., "validators")
}
```

### Common Fields
- `amount` - Token amount (usually in base units)
- `validatorAddress` - Validator to delegate to
- `cosmosPubKey` - Cosmos-specific public key
- `additionalAddresses` - Chain-specific address fields

---

## SDK

### TypeScript SDK
```bash
npm install @yieldxyz/sdk
```

**Features**:
- Type-safe interface over the API
- Built-in helpers for signing, formatting, and transaction management
- Supports hardware wallets, mnemonics, and contract wallets
- Automatic schema validation
- Multi-chain transaction construction

### Signers Package
```bash
npm install @stakekit/signers
```

**Features**:
- Signing across multiple wallet types
- Chain-specific signing logic
- Hardware wallet integration
- Custom signer support

---

## Integration Flow

### 1. Discover Yields
```bash
GET /v1/yields?network=ethereum&token=ETH
```

### 2. Get Yield Details (with schema)
```bash
GET /v1/yields/{yieldId}
```

### 3. Check User Balances
```bash
GET /v1/yields/{yieldId}/balances?address={wallet}
```

### 4. Declare Intent
```bash
POST /v1/actions/enter
{
  "yieldId": "lido-eth-staking",
  "address": "0x...",
  "arguments": {
    "amount": "1000000000000000000"
  }
}
```

### 5. Handle Response (TransactionDto[])
```typescript
{
  "transactions": [
    {
      "to": "0x...",
      "data": "0x...",
      "value": "0x0",
      "estimatedGas": "85000",
      "annotation": {
        "method": "approve",
        "params": { "spender": "0x...", "amount": "1000000000000000000" }
      }
    },
    {
      "to": "0x...",
      "data": "0x...",
      "value": "0x0",
      "estimatedGas": "200000",
      "annotation": {
        "method": "deposit",
        "params": { "amount": "1000000000000000000" }
      }
    }
  ]
}
```

### 6. Sign & Submit
- Sign using any infrastructure
- Submit to chain
- Optionally submit hash for tracking: `PUT /v1/transactions/submit-hash`

---

## Advanced Features

### Allocator Vaults (OAVs)
ERC-4626-compliant smart contracts that:
- Wrap third-party DeFi strategies
- Enable automatic compounding
- Support configurable fee logic (deposit, performance, management)
- Integrate via Adapter contracts
- Support single and multi-strategy configurations

**Use Cases**:
- Custom yield strategies with monetization
- Stablecoin optimization vaults
- Multi-protocol yield aggregation

### Geoblocking
Partners can configure geoblocking to restrict access by:
- Country/region
- US states (Focused Blocks)

**Configuration**: Via dashboard or API

### Custom RPC URIs
Partners can use their own RPC nodes for enhanced control and privacy.

### Whitelabel Validator Nodes
Partners can run their own validator infrastructure for:
- Custom commission rates
- Brand customization
- Enhanced decentralization

### Shield
Security feature for enhanced protection on high-value operations.

### Smart Routing
If user holds a different input token than what the yield expects, the API returns a valid route including:
- Swaps (via DEX aggregators)
- Bridges (cross-chain)
- Multi-step transactions

---

## Additional Documentation

- **Core Concepts**: https://docs.yield.xyz/docs/core-concepts
- **Actions**: https://docs.yield.xyz/docs/actions
- **Balances**: https://docs.yield.xyz/docs/balances
- **Yield Metadata**: https://docs.yield.xyz/docs/yield-metadata
- **API Reference**: https://reference.yield.xyz/
- **Dashboard**: https://dashboard.stakek.it/
- **NPM SDK**: https://www.npmjs.com/package/@yieldxyz/sdk
- **FeeWrapper Audit**: https://github.com/Zellic/publications/blob/master/StakeKit%20FeeWrapper%20-%20Zellic%20Audit%20Report.pdf

---

## Contact

- **Email**: hello@yield.xyz
- **Support**: Dedicated Slack/Telegram channel (for partners)
- **Dashboard**: https://dashboard.stakek.it/

---

## Deep Dive Findings (Enhanced Analysis)

### Transaction Submission Flow (Clarified)

The API is **self-custodial by design**. The flow is:

1. **Declare Intent** → `POST /v1/actions/{enter|exit|manage}`
2. **Receive Transactions** → Array of `TransactionDto` with unsigned tx data
3. **Sign Locally** → Use your wallet infrastructure (MetaMask, Ledger, chain adapters, etc.)
4. **Broadcast to Chain** → Submit directly to blockchain RPC
5. **Optional Tracking** → `PUT /v1/transactions/submit-hash` to track status in Yield.xyz

**Important**: You do NOT submit signed transactions to Yield.xyz. They never touch private keys or execute transactions.

### Chain-Specific Fee Handling

| Chain | Fee Mechanism | Atomicity |
|-------|---------------|-----------|
| **EVM** | FeeWrapper contracts (ERC-4626) | ✅ Atomic |
| **Solana** | `SystemProgram.transfer` instruction | ✅ Atomic |
| **Cosmos** | `MsgSend` bundled with `MsgDelegate` | ✅ Atomic |
| **TON** | Additional cell (up to 4 per tx) | ✅ Atomic |
| **Cardano** | Transaction output in delegation | ✅ Atomic |
| **Tron** | **Separate transaction** | ❌ Non-atomic |

**Tron caveat**: Requires user to sign fee tx first, then staking tx. Handle this UX explicitly.

### Passthrough Token Pattern

Critical for position management:

```typescript
// 1. Get balances with pending actions
const balances = await yieldxyzClient.getYieldBalances(yieldId, address)
// Response includes: pendingActions[{ type, passthrough, arguments }]

// 2. Execute pending action - MUST include passthrough
await yieldxyzClient.manageYield({
  yieldId,
  address,
  action: 'CLAIM_REWARDS',
  passthrough: balance.pendingActions[0].passthrough, // Required!
  arguments: {}
})
```

The `passthrough` is an opaque server-generated token. Don't try to parse it.

### Allocator Vaults vs Base Yields

**Base Yields (Recommended for MVP)**:
- Direct protocol interaction
- No wrapper fees
- Full DeFi composability (users get actual receipt tokens like stETH)
- Simpler integration

**Optimized Allocator Vaults (OAVs)**:
- Custom vault wrapper
- Performance/management fee support
- Auto-compounding
- Multi-strategy allocation
- Reduced composability (vault shares, not underlying tokens)

### Additional Supported Manage Actions

Beyond basic claim/restake:

| Action | Description | When Available |
|--------|-------------|----------------|
| `CLAIM_REWARDS` | Claim accumulated rewards | Rewards > 0 |
| `RESTAKE_REWARDS` | Auto-compound rewards | Protocol supports |
| `REDELEGATE` | Switch validators | Validator-based yields |
| `WITHDRAW` | Withdraw after cooldown | State = withdrawable |
| `UNLOCK` | Unlock locked positions | State = locked (vesting) |
| `VOTE` | Governance voting | Some protocols |

### Rate Limits Reference

| Plan | Rate Limit | OAV Limit | Best For |
|------|------------|-----------|----------|
| **Trial** | 1 req/sec | 3 OAVs | Testing, prototypes |
| **Standard** | 100 req/sec | 10 OAVs | Production apps |
| **Pro** | 1,000+ req/sec | Unlimited | High-volume platforms |

---

## Summary

Yield.xyz provides a unified, self-custodial API for integrating yield opportunities across 80+ networks and protocols. Key highlights:

- ✅ **80% DeFi market coverage**
- ✅ **80+ networks** (EVM, Cosmos, Solana, TON, etc.)
- ✅ **Schema-driven** for dynamic UI generation
- ✅ **Self-custody** - you control signing (they never touch keys)
- ✅ **Flexible monetization** (deposit, performance, management fees)
- ✅ **Single integration** for all chains and protocols
- ✅ **Type-safe SDK** available (`@stakekit/signers`)
- ✅ **Audited FeeWrapper** contracts (Zellic audit)

This enables wallets, custodians, fintechs, and AI agents to offer on-chain yield with full control over UX, signing, and monetization.
