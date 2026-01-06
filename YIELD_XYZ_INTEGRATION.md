# Yield.xyz Integration - Technical Spike

> **Status**: Exploration/Spike Phase — NOT YET IMPLEMENTED
>
> This document is a technical spike exploring the Yield.xyz integration. We've gone deeper than initial analysis to understand the API patterns, signing flows, and integration points. No code has been written yet. This serves as our technical spec to guide future implementation once we're ready to build.

## Overview

This document outlines the implementation plan for integrating **Yield.xyz** into the ShapeShift web application. The integration will introduce a new "New DeFi" page that provides a clean, React-query driven interface for discovering and interacting with yield opportunities across 80+ blockchain networks.

### Key Design Principles

1. **Pure React-Query**: No Redux store for yield data - use TanStack Query for all API interactions
2. **Schema-Driven UI**: All forms and inputs are generated from Yield.xyz API schemas
3. **Self-Custody**: API constructs transactions; user signs and broadcasts
4. **Chain-Agnostic**: Unified interface across EVM, Cosmos, Solana, TON, and other chains
5. **Fee Monetization**: Take configurable fee BPS from yield opportunities

---

## Table of Contents

1. [Yield.xyz API Overview](#yieldxyz-api-overview)
2. [Fee Structure](#fee-structure)
3. [Architecture](#architecture)
4. [Transaction Signing & Broadcasting](#transaction-signing--broadcasting)
5. [Component Design](#component-design)
6. [Implementation Steps](#implementation-steps)
7. [Integration Points](#integration-points)
8. [Environment Configuration](#environment-configuration)
9. [Testing Strategy](#testing-strategy)
10. [Empirical API Findings](#empirical-api-findings)
11. [Summary](#summary)

### Core Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/yields` | GET | List all yield opportunities with optional filters |
| `/v1/yields/{yieldId}` | GET | Get detailed metadata including schemas |
| `/v1/yields/{yieldId}/validators` | GET | Get validators for validator-based yields |
| `/v1/yields/{yieldId}/balances` | GET | Get user's balances for a specific yield |
| `/v1/yields/balances` | POST | Batch query balances across yields/networks |
| `/v1/actions/enter` | POST | Create a new position (stake, lend, deposit) |
| `/v1/actions/exit` | POST | Unwind a position (unstake, withdraw) |
| `/v1/actions/manage` | POST | Follow-up actions (claim, restake, redelegate) |
| `/v1/transactions/submit` | POST | Submit a signed transaction |

### Authentication

```typescript
// All requests require:
Headers: {
  'X-API-KEY': '<YOUR_API_KEY>',
  'Content-Type': 'application/json'
}

// Base URL: https://api.yield.xyz/v1
```

### Supported Networks (80+)

**EVM Networks (17+)**:
- Ethereum, Arbitrum, Avalanche, Base, BNB Chain, Polygon, Optimism, Linea, Celo, CoreDAO, Cronos, Gnosis, Harmony, Hyperliquid, Monad, Sonic, Unichain, Viction

**Cosmos Ecosystem (40+)**:
- Cosmos (ATOM), Osmosis (OSMO), Injective (INJ), dYdX, Juno (JUNO), Secret (SCRT), Stargaze (STARS), Sommelier (SOMM), Axelar (AXL), Band Protocol (BAND), and 30+ more

**Other Chains**:
- Solana, Tezos, Cardano, Polkadot, Kusama, NEAR, TON, Bittensor, Celestia, Dymension

### Yield Types

1. **Native Staking** - Direct staking with validators
2. **Liquid Staking** - Lido (stETH/stMATIC), RocketPool (rETH), Benqi (avETH), JustLend (stTRX)
3. **Restaking** - EigenLayer, EtherFi, Renzo, KelpDAO
4. **DeFi Lending** - Aave V3, Compound V3, Spark, Fluid, Gearbox, Morpho
5. **Vaults** - Yearn V2/V3, Ethena, Maple, Sommelier, Euler
6. **Stablecoins** - 200+ strategies across Aave, Compound, Morpho, Yearn, etc.

---

## Fee Structure

### Fee Types

Yield.xyz supports three fee types for monetization:

| Fee Type | Range | Timing | Mechanism | Composable |
|----------|-------|--------|-----------|------------|
| **Deposit Fee** | 0.2-0.8% | At deposit | FeeWrapper (EVM) / Atomic (non-EVM) | ✅ Yes |
| **Performance Fee** | 10-30% | At harvest | ERC-4626 OAVs | ❌ Limited |
| **Management Fee** | 1-5% annually | At harvest | ERC-4626 OAVs | ❌ Limited |

### Fee Configuration

Fees are configured at the **project level** in the Yield.xyz dashboard:
1. Navigate to https://dashboard.stakek.it/
2. Go to your project settings
3. Configure fee mechanisms under "Setting up discretionary fees"

### How Fees Work

**Deposit Fees (EVM)**:
- Uses FeeWrapper smart contracts (ERC-4626 compliant)
- Deducts configurable percentage from user deposits
- Transfers fee to designated recipient
- Remaining balance deposited into target protocol
- Atomic execution in single transaction

**Deposit Fees (Non-EVM)**:
- Solana: Additional program instruction for fee transfer
- Cosmos: Additional proto message (MsgSend) bundled with delegation
- TON: Additional cell bundled in transaction
- Cardano: Transaction output bundled with delegation certificate

### Fee BPS in Our App

```typescript
// Configuration in .env
VITE_YIELD_XYZ_FEE_BPS=50  // 0.5% fee (50 basis points)

// Display adjusted rates to users
const calculateAdjustedApy = (baseApy: number, feeBps: number): number => {
  const feePercentage = feeBps / 10000
  return baseApy * (1 - feePercentage)
}
```

**Important**: Fee configuration should be done at the Yield.xyz dashboard level. Our app displays yields as-is from the API; the fee is deducted automatically by the protocol.

---

## Architecture

### Directory Structure

```
src/
├── lib/
│   └── yieldxyz/
│       ├── client.ts              # API client
│       ├── types.ts               # TypeScript types
│       └── config.ts              # Configuration
├── pages/
│   └── Yield/
│       ├── Yield.tsx              # Main page component
│       ├── components/
│       │   ├── YieldList.tsx      # List of available yields
│       │   ├── YieldCard.tsx      # Individual yield card
│       │   ├── YieldActionsModal.tsx    # Enter/Exit modal
│       │   ├── YieldInputForm.tsx       # Dynamic form from schema
│       │   ├── YourPositions.tsx        # User's positions
│       │   ├── PositionCard.tsx         # Individual position card
│       │   ├── YieldFilters.tsx         # Network/asset filters
│       │   ├── YieldSkeleton.tsx        # Loading skeleton
│       │   └── TransactionStatus.tsx    # Signing/broadcast status
│       ├── hooks/
│       │   ├── useYields.ts             # Fetch yields list
│       │   ├── useYield.ts              # Fetch single yield with schema
│       │   ├── useYieldValidators.ts    # Fetch validators
│       │   ├── useYieldBalances.ts      # Fetch user balances
│       │   ├── useEnterYield.ts         # Enter yield mutation
│       │   ├── useExitYield.ts          # Exit yield mutation
│       │   ├── useManageYield.ts        # Manage actions mutation
│       │   └── useSignAndBroadcast.ts   # Transaction signing helper
│       └── utils/
│           ├── formSchema.ts            # Convert API schema to form
│           └── transaction.ts           # Transaction helpers
├── components/
│   └── Layout/
│       └── YieldPageHeader.tsx          # Navigation header
├── assets/
│   └── translations/
│       └── en/
│           └── main.json                # Translation keys
└── Routes/
    └── RoutesCommon.tsx                 # Route registration
```

### API Client

```typescript
// src/lib/yieldxyz/client.ts
import { getConfig } from '@/config'

const API_BASE_URL = 'https://api.yield.xyz/v1'

const getHeaders = () => ({
  'X-API-KEY': getConfig().VITE_YIELD_XYZ_API_KEY,
  'Content-Type': 'application/json',
})

export const yieldxyzClient = {
  // Discovery
  async getYields(params?: { network?: string; token?: string; provider?: string }) {
    const searchParams = new URLSearchParams(params)
    const response = await fetch(`${API_BASE_URL}/yields?${searchParams}`, {
      headers: getHeaders(),
    })
    if (!response.ok) throw new Error('Failed to fetch yields')
    return response.json()
  },

  async getYield(yieldId: string) {
    const response = await fetch(`${API_BASE_URL}/yields/${yieldId}`, {
      headers: getHeaders(),
    })
    if (!response.ok) throw new Error('Failed to fetch yield')
    return response.json()
  },

  async getYieldValidators(yieldId: string) {
    const response = await fetch(`${API_BASE_URL}/yields/${yieldId}/validators`, {
      headers: getHeaders(),
    })
    if (!response.ok) throw new Error('Failed to fetch validators')
    return response.json()
  },

  // Actions
  async enterYield(data: {
    yieldId: string
    address: string
    arguments: Record<string, unknown>
  }) {
    const response = await fetch(`${API_BASE_URL}/actions/enter`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to enter yield')
    return response.json()
  },

  async exitYield(data: {
    yieldId: string
    address: string
    arguments: Record<string, unknown>
    passthrough: string
  }) {
    const response = await fetch(`${API_BASE_URL}/actions/exit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to exit yield')
    return response.json()
  },

  async manageYield(data: {
    yieldId: string
    address: string
    action: string
    arguments?: Record<string, unknown>
    passthrough: string
  }) {
    const response = await fetch(`${API_BASE_URL}/actions/manage`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to manage yield')
    return response.json()
  },

  // Balances
  async getYieldBalances(yieldId: string, address: string) {
    const response = await fetch(
      `${API_BASE_URL}/yields/${yieldId}/balances?address=${address}`,
      { headers: getHeaders() }
    )
    if (!response.ok) throw new Error('Failed to fetch balances')
    return response.json()
  },

  async getAllBalances(data: { address: string; networks?: string[] }) {
    const response = await fetch(`${API_BASE_URL}/yields/balances`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to fetch all balances')
    return response.json()
  },

  // Transaction Submission
  async submitTransaction(data: {
    actionId: string
    network: string
    transaction: {
      to: string
      data: string
      value?: string
    }
    signature?: string
  }) {
    const response = await fetch(`${API_BASE_URL}/transactions/submit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to submit transaction')
    return response.json()
  },

  async submitTransactionHash(data: {
    actionId: string
    hash: string
  }) {
    const response = await fetch(`${API_BASE_URL}/transactions/submit-hash`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to submit transaction hash')
    return response.json()
  },
}
```

### TypeScript Types

```typescript
// src/lib/yieldxyz/types.ts

// Core Types
export interface YieldDto {
  id: string
  network: string
  token: TokenDto
  inputTokens: TokenDto[]
  outputToken?: TokenDto
  status: {
    enter: boolean
    exit: boolean
  }
  metadata: {
    name: string
    description: string
    logoURI: string
    documentationLink?: string
  }
  rewardRate: {
    total: number
    rateType: 'APR' | 'APY'
    components: {
      type: 'staking' | 'incentive' | 'mev' | 'points'
      apr: number
    }[]
  }
  providerId: string
  mechanics: {
    arguments: {
      enter: Schema
      exit: Schema
      balance: Schema
    }
    cooldownPeriod?: number
    withdrawPeriod?: number
    warmupPeriod?: number
    fee?: {
      deposit?: number
      withdrawal?: number
      performance?: number
    }
  }
  entryLimits?: {
    minimum?: string
    maximum?: string
  }
  validators?: Validator[]
  tags?: string[]
}

export interface TokenDto {
  assetId: string
  symbol: string
  name: string
  decimals: number
  contractAddress?: string
}

export interface Validator {
  address: string
  name: string
  apr: number
  commission: number
  stake?: string
  logoURI?: string
}

export interface Schema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum'
  required: boolean
  label: string
  description?: string
  pattern?: string
  minimum?: number
  maximum?: number
  decimals?: number
  enumValues?: { value: string; label: string }[]
  properties?: Record<string, Schema>
  items?: Schema
  ref?: string
}

// Balance Types
export interface BalanceDto {
  address: string
  yieldId: string
  type: BalanceType
  amount: string
  amountRaw: string
  amountUsd: number
  token: TokenDto
  validator?: Validator
  validators?: Validator[]
  pendingActions?: PendingAction[]
  isEarning: boolean
  metadata?: {
    depositedAt?: string
    lastHarvestAt?: string
  }
}

export type BalanceType =
  | 'active'
  | 'entering'
  | 'exiting'
  | 'withdrawable'
  | 'claimable'
  | 'locked'

export interface PendingAction {
  type: 'CLAIM_REWARDS' | 'RESTAKE_REWARDS' | 'REDELEGATE' | 'WITHDRAW' | 'EXIT'
  passthrough: string
  arguments?: Schema
}

// Action Types
export interface ActionDto {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  transactions: TransactionDto[]
  metadata: {
    type: 'enter' | 'exit' | 'manage'
    inputAmount: string
    outputAmount?: string
    fee?: number
  }
}

export interface TransactionDto {
  title: string
  type: string
  network: string
  stepIndex: number
  unsignedTransaction: {
    to: string
    data: string
    value?: string
  }
  annotatedTransaction?: {
    method: string
    params: Record<string, unknown>
  }
  gasEstimate?: string
  explorerUrl?: string
  description?: string
  isMessage?: boolean
}
```

---

## Transaction Signing & Broadcasting

### Chain Adapter Integration

The app uses `@shapeshiftoss/chain-adapters` for transaction signing across all supported chains. The signing pattern varies by chain type:

### EVM Signing Pattern

```typescript
// src/lib/yieldxyz/signing/evm.ts
import type { EvmChainAdapter, SignTx, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'

interface SignAndBroadcastArgs {
  adapter: EvmChainAdapter
  txToSign: SignTx<EvmChainId>
  wallet: HDWallet
  senderAddress: string
  receiverAddress: string
}

export const signAndBroadcastEvm = async ({
  adapter,
  txToSign,
  wallet,
  senderAddress,
  receiverAddress,
}: SignAndBroadcastArgs): Promise<string> => {
  if (!wallet) throw new Error('Wallet is required')

  if (wallet.supportsOfflineSigning()) {
    // Sign offline, then broadcast
    const signedTx = await adapter.signTransaction({ txToSign, wallet })
    const txid = await adapter.broadcastTransaction({
      senderAddress,
      receiverAddress,
      hex: signedTx,
    })
    return txid
  }

  if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
    // Sign and broadcast in one step (e.g., MetaMask)
    const txid = await adapter.signAndBroadcastTransaction({
      senderAddress,
      receiverAddress,
      signTxInput: { txToSign, wallet },
    })
    return txid
  }

  throw new Error('Wallet does not support signing or broadcasting')
}
```

### Cosmos SDK Signing Pattern

```typescript
// src/lib/yieldxyz/signing/cosmos.ts
import type { CosmosSdkChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { CosmosSdkChainId } from '@shapeshiftoss/types'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

interface SignAndBroadcastCosmosArgs {
  chainId: CosmosSdkChainId
  txToSign: unknown // Cosmos-specific tx type
  wallet: HDWallet
  senderAddress: string
  receiverAddress: string
}

export const signAndBroadcastCosmos = async ({
  chainId,
  txToSign,
  wallet,
  senderAddress,
  receiverAddress,
}: SignAndBroadcastCosmosArgs): Promise<string> => {
  const adapter = getChainAdapterManager().get(chainId) as CosmosSdkChainAdapter
  if (!adapter) throw new Error(`No adapter for chain: ${chainId}`)

  if (wallet.supportsOfflineSigning()) {
    const signedTx = await adapter.signTransaction({ txToSign, wallet })
    const txid = await adapter.broadcastTransaction({
      senderAddress,
      receiverAddress,
      hex: signedTx,
    })
    return txid
  }

  if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
    const txid = await adapter.signAndBroadcastTransaction({
      senderAddress,
      receiverAddress,
      signTxInput: { txToSign, wallet },
    })
    return txid
  }

  throw new Error('Wallet does not support Cosmos signing or broadcasting')
}
```

### Universal Signing Hook

```typescript
// src/pages/Yield/hooks/useSignAndBroadcast.ts
import { useCallback } from 'react'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import type { ChainId } from '@shapeshiftoss/caip'
import type { SignTx } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { TransactionDto } from '@/lib/yieldxyz/types'

interface UseSignAndBroadcastReturn {
  signAndBroadcast: (
    transaction: TransactionDto,
    accountNumber: number,
  ) => Promise<string>
}

export const useSignAndBroadcast = (): UseSignAndBroadcastReturn => {
  const {
    state: { wallet },
  } = useWallet()
  const chainAdapterManager = getChainAdapterManager()

  const signAndBroadcast = useCallback(
    async (transaction: TransactionDto, accountNumber: number): Promise<string> => {
      if (!wallet) throw new Error('Wallet not connected')

      const adapter = chainAdapterManager.get(transaction.network as ChainId)
      if (!adapter) throw new Error(`No adapter for network: ${transaction.network}`)

      const senderAddress = await adapter.getAddress({ accountNumber, wallet })
      const receiverAddress = transaction.annotatedTransaction?.params?.to as string

      const txToSign: SignTx<ChainId> = {
        to: transaction.unsignedTransaction.to,
        value: transaction.unsignedTransaction.value || '0',
        data: transaction.unsignedTransaction.data,
        chainId: transaction.network,
        accountNumber,
        nonce: '', // Will be populated by adapter
        fee: '',   // Will be populated by adapter
      }

      // Delegate to chain-specific implementation
      if (transaction.type === 'evm') {
        return signAndBroadcastEvm({
          adapter: adapter as any,
          txToSign,
          wallet,
          senderAddress,
          receiverAddress,
        })
      }

      if (transaction.type === 'cosmos') {
        return signAndBroadcastCosmos({
          chainId: transaction.network as any,
          txToSign,
          wallet,
          senderAddress,
          receiverAddress,
        })
      }

      // Add more chain types as needed (solana, tron, etc.)
      throw new Error(`Unsupported transaction type: ${transaction.type}`)
    },
    [wallet, chainAdapterManager],
  )

  return { signAndBroadcast }
}
```

---

## Component Design

### Main Page Component

```typescript
// src/pages/Yield/Yield.tsx
import { Box, Container, Heading, Text, Button } from '@chakra-ui/react'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useTranslate } from 'react-polyglot'
import { YieldList } from './components/YieldList'
import { YourPositions } from './components/YourPositions'
import { YieldFilters } from './components/YieldFilters'

export const Yield = () => {
  const translate = useTranslate()
  const { state: { isConnected, wallet } } = useWallet()

  if (!isConnected) {
    return (
      <Container maxW='1200px' py={8}>
        <Box textAlign='center' py={16}>
          <Heading as='h2' size='xl' mb={4}>
            {translate('yieldxyz.pageTitle')}
          </Heading>
          <Text color='text.subtle' mb={8} maxW='md' mx='auto'>
            {translate('yieldxyz.connectWalletDescription')}
          </Text>
          <Button
            size='lg'
            onClick={() => window.location.href = '/connect-wallet'}
          >
            {translate('common.connectWallet')}
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxW='1200px' py={8}>
      <Box mb={8}>
        <Heading as='h2' size='xl' mb={2}>
          {translate('yieldxyz.pageTitle')}
        </Heading>
        <Text color='text.subtle'>
          {translate('yieldxyz.pageSubtitle')}
        </Text>
      </Box>

      <YourPositions />
      <YieldFilters />
      <YieldList />
    </Container>
  )
}
```

### Yield Card Component

```typescript
// src/pages/Yield/components/YieldCard.tsx
import { Card, CardBody, Flex, Button, Badge, Skeleton, Tooltip } from '@chakra-ui/react'
import type { YieldDto } from '@/lib/yieldxyz/types'
import { Amount } from '@/components/Amount/Amount'
import { useTranslate } from 'react-polyglot'

interface YieldCardProps {
  yieldItem: YieldDto
  onEnter: (yieldItem: YieldDto) => void
  isLoading?: boolean
}

export const YieldCard = ({ yieldItem, onEnter, isLoading }: YieldCardProps) => {
  const translate = useTranslate()

  return (
    <Card variant='outline' _hover={{ shadow: 'md' }} transition='all 0.2s'>
      <CardBody>
        <Flex justifyContent='space-between' alignItems='flex-start' mb={4}>
          <Flex alignItems='center' gap={3}>
            {/* Token Icon */}
            <Box
              w={10}
              h={10}
              borderRadius='full'
              bg='gray.700'
              backgroundImage={`url(${yieldItem.metadata.logoURI})`}
              backgroundSize='cover'
              backgroundPosition='center'
            />
            <Box>
              <Text fontWeight='bold' fontSize='lg'>
                {yieldItem.metadata.name}
              </Text>
              <Flex alignItems='center' gap={2}>
                <Text fontSize='sm' color='text.subtle'>
                  {yieldItem.token.symbol}
                </Text>
                <Badge colorScheme='blue' fontSize='xs'>
                  {yieldItem.network}
                </Badge>
              </Flex>
            </Box>
          </Flex>

          <Flex direction='column' alignItems='flex-end'>
            <Skeleton isLoaded={!isLoading}>
              <Tooltip label={translate('yieldxyz.apyTooltip')}>
                <Text fontWeight='bold' fontSize='xl' color='green.500'>
                  {yieldItem.rewardRate.total.toFixed(2)}%
                  <Text as='span' fontSize='sm' fontWeight='normal'>
                    {' '}{yieldItem.rewardRate.rateType}
                  </Text>
                </Text>
              </Tooltip>
            </Skeleton>
            <Badge colorScheme='purple' mt={1}>
              {yieldItem.providerId}
            </Badge>
          </Flex>
        </Flex>

        {/* APY Breakdown */}
        {yieldItem.rewardRate.components.length > 0 && (
          <Flex gap={2} mb={4} flexWrap='wrap'>
            {yieldItem.rewardRate.components.map((component, idx) => (
              <Badge key={idx} variant='subtle' colorScheme='gray' fontSize='xs'>
                {component.type}: {component.apr.toFixed(2)}%
              </Badge>
            ))}
          </Flex>
        )}

        {/* Entry Limits */}
        {yieldItem.entryLimits && (
          <Text fontSize='xs' color='text.subtle' mb={4}>
            {translate('yieldxyz.minDeposit')}:{' '}
            {yieldItem.entryLimits.minimum
              ? `${yieldItem.entryLimits.minimum} ${yieldItem.token.symbol}`
              : translate('common.none')}
          </Text>
        )}

        <Button
          width='full'
          colorScheme='blue'
          isDisabled={!yieldItem.status.enter}
          isLoading={isLoading}
          onClick={() => onEnter(yieldItem)}
        >
          {translate('common.deposit')}
        </Button>
      </CardBody>
    </Card>
  )
}
```

### Dynamic Form from Schema

```typescript
// src/pages/Yield/components/YieldInputForm.tsx
import { useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Box, Input, Select, FormControl, FormLabel, FormErrorMessage, VStack } from '@chakra-ui/react'
import type { Schema } from '@/lib/yieldxyz/types'
import { useTranslate } from 'react-polyglot'

interface YieldInputFormProps {
  schema: Schema
  onSubmit: (data: Record<string, unknown>) => void
  defaultValues?: Record<string, unknown>
  validators?: Record<string, unknown[]>
}

export const YieldInputForm = ({
  schema,
  onSubmit,
  defaultValues = {},
  validators = [],
}: YieldInputFormProps) => {
  const translate = useTranslate()
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues,
  })

  const renderField = (key: string, fieldSchema: Schema) => {
    const isRequired = fieldSchema.required

    switch (fieldSchema.type) {
      case 'string':
        if (fieldSchema.enumValues) {
          return (
            <Controller
              name={key}
              control={control}
              rules={{ required: isRequired && translate('common.required') }}
              render={({ field }) => (
                <FormControl isInvalid={!!errors[key]} isRequired={isRequired}>
                  <FormLabel>{fieldSchema.label}</FormLabel>
                  <Select {...field} placeholder={translate('common.select')}>
                    {fieldSchema.enumValues.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <FormErrorMessage>{errors[key]?.message as string}</FormErrorMessage>
                </FormControl>
              )}
            />
          )
        }

        return (
          <Controller
            name={key}
            control={control}
            rules={{
              required: isRequired && translate('common.required'),
              pattern: fieldSchema.pattern && {
                value: new RegExp(fieldSchema.pattern),
                message: translate('common.invalidFormat'),
              },
            }}
            render={({ field }) => (
              <FormControl isInvalid={!!errors[key]} isRequired={isRequired}>
                <FormLabel>{fieldSchema.label}</FormLabel>
                <Input
                  {...field}
                  type={key.toLowerCase().includes('amount') ? 'number' : 'text'}
                  placeholder={fieldSchema.description || ''}
                />
                <FormErrorMessage>{errors[key]?.message as string}</FormErrorMessage>
              </FormControl>
            )}
          />
        )

      case 'number':
        return (
          <Controller
            name={key}
            control={control}
            rules={{
              required: isRequired && translate('common.required'),
              min: fieldSchema.minimum && {
                value: fieldSchema.minimum,
                message: translate('common.minimumAmount', { amount: fieldSchema.minimum }),
              },
              max: fieldSchema.maximum && {
                value: fieldSchema.maximum,
                message: translate('common.maximumAmount', { amount: fieldSchema.maximum }),
              },
            }}
            render={({ field }) => (
              <FormControl isInvalid={!!errors[key]} isRequired={isRequired}>
                <FormLabel>{fieldSchema.label}</FormLabel>
                <Input
                  {...field}
                  type='number'
                  step={fieldSchema.decimals ? `0.${'0'.repeat(fieldSchema.decimals - 1)}1` : '0.0001'}
                  placeholder={fieldSchema.description || ''}
                />
                <FormErrorMessage>{errors[key]?.message as string}</FormErrorMessage>
              </FormControl>
            )}
          />
        )

      default:
        return null
    }
  }

  const formFields = useMemo(() => {
    if (!schema.properties) return null
    return Object.entries(schema.properties).map(([key, fieldSchema]) => (
      <Box key={key} width='100%'>
        {renderField(key, fieldSchema as Schema)}
      </Box>
    ))
  }, [schema, errors, control])

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <VStack spacing={4} align='stretch'>
        {formFields}
      </VStack>
    </form>
  )
}
```

### Actions Modal

```typescript
// src/pages/Yield/components/YieldActionsModal.tsx
import { useState, useEffect } from 'react'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogHeader, DialogHeaderMiddle, DialogHeaderRight } from '@/components/Modal/components/DialogHeader'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { Box, Button, Flex, Text, Skeleton, Alert, AlertIcon } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { YieldInputForm } from './YieldInputForm'
import { TransactionStatus } from './TransactionStatus'
import { useEnterYield } from '../hooks/useEnterYield'
import { useExitYield } from '../hooks/useExitYield'
import { useSignAndBroadcast } from '../hooks/useSignAndBroadcast'
import type { YieldDto, ActionDto, TransactionDto } from '@/lib/yieldxyz/types'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { selectAccountNumberByAccountId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'
import { fromAccountId } from '@shapeshiftoss/caip'

type YieldActionsModalProps = {
  isOpen: boolean
  onClose: () => void
  yieldItem: YieldDto | null
  mode: 'enter' | 'exit'
  accountId?: string
}

type TransactionStep = 'form' | 'signing' | 'broadcasting' | 'success' | 'error'

export const YieldActionsModal = ({
  isOpen,
  onClose,
  yieldItem,
  mode,
  accountId,
}: YieldActionsModalProps) => {
  const translate = useTranslate()
  const { state: { wallet } } = useWallet()
  const chainAdapterManager = getChainAdapterManager()
  const [step, setStep] = useState<TransactionStep>('form')
  const [txId, setTxId] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [actionResult, setActionResult] = useState<ActionDto | null>(null)

  const enterYield = useEnterYield()
  const exitYield = useExitYield()
  const { signAndBroadcast } = useSignAndBroadcast()

  // Get account number for signing
  const accountNumber = useAppSelector((state) =>
    accountId ? selectAccountNumberByAccountId(state, accountId) : 0
  )

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    if (!yieldItem || !wallet || !accountId) return

    setStep('signing')
    setError('')

    try {
      // 1. Declare intent
      const actionData = {
        yieldId: yieldItem.id,
        address: fromAccountId(accountId).account,
        arguments: formData,
        ...(mode === 'exit' && { passthrough: actionResult?.transactions[0]?.passthrough || '' }),
      }

      const result = mode === 'enter'
        ? await enterYield.mutateAsync(actionData)
        : await exitYield.mutateAsync(actionData)

      setActionResult(result)

      if (!result.transactions.length) {
        throw new Error('No transactions returned')
      }

      // 2. Sign and broadcast each transaction
      for (let i = 0; i < result.transactions.length; i++) {
        const transaction = result.transactions[i]
        setStep('signing')
        
        const txId = await signAndBroadcast(transaction, accountNumber)
        setTxId(txId)
        setStep('broadcasting')
      }

      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed')
      setStep('error')
    }
  }

  const handleClose = () => {
    setStep('form')
    setTxId('')
    setError('')
    setActionResult(null)
    onClose()
  }

  if (!yieldItem) return null

  const schema = mode === 'enter'
    ? yieldItem.mechanics.arguments.enter
    : yieldItem.mechanics.arguments.exit

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <DialogHeader>
        <DialogHeaderMiddle>
          {mode === 'enter'
            ? translate('yieldxyz.depositTitle', { asset: yieldItem.metadata.name })
            : translate('yieldxyz.withdrawTitle', { asset: yieldItem.metadata.name })
          }
        </DialogHeaderMiddle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>

      <DialogBody>
        {step === 'form' && (
          <Box>
            {/* Yield Info */}
            <Flex justifyContent='space-between' mb={6} p={3} bg='background-surface' borderRadius='md'>
              <Box>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('common.apy')}
                </Text>
                <Text fontWeight='bold' color='green.500'>
                  {yieldItem.rewardRate.total.toFixed(2)}%
                </Text>
              </Box>
              <Box textAlign='right'>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('common.provider')}
                </Text>
                <Text fontWeight='bold'>
                  {yieldItem.providerId}
                </Text>
              </Box>
            </Flex>

            {/* Dynamic Form */}
            <YieldInputForm
              schema={schema}
              onSubmit={handleFormSubmit}
            />
          </Box>
        )}

        {(step === 'signing' || step === 'broadcasting') && (
          <TransactionStatus
            step={step}
            txId={txId}
            explorerUrl={actionResult?.transactions[0]?.explorerUrl}
          />
        )}

        {step === 'success' && (
          <Box textAlign='center' py={8}>
            <Text fontSize='4xl' mb={4}>🎉</Text>
            <Text fontWeight='bold' fontSize='lg' mb={2}>
              {translate('common.success')}
            </Text>
            {txId && (
              <Text fontSize='sm' color='text.subtle' mb={4}>
                <a href={actionResult?.transactions[0]?.explorerUrl} target='_blank' rel='noopener noreferrer'>
                  {translate('common.viewOnExplorer')}
                </a>
              </Text>
            )}
            <Button onClick={handleClose}>
              {translate('common.done')}
            </Button>
          </Box>
        )}

        {step === 'error' && (
          <Alert status='error' borderRadius='md'>
            <AlertIcon />
            {error || translate('common.somethingWentWrong')}
          </Alert>
        )}
      </DialogBody>

      {step === 'form' && (
        <DialogFooter>
          <Button variant='ghost' mr={3} onClick={handleClose}>
            {translate('common.cancel')}
          </Button>
        </DialogFooter>
      )}
    </Dialog>
  )
}
```

---

## Implementation Steps

### Phase 1: Foundation

1. **Add environment variables**
   - `VITE_YIELD_XYZ_API_KEY` to `.env` and `.env.development`
   - Add validation in `src/config.ts`

2. **Create API client**
   - `src/lib/yieldxyz/client.ts`
   - `src/lib/yieldxyz/types.ts`
   - Basic fetch wrappers for all endpoints

3. **Add translation keys**
   - Add to `src/assets/translations/en/main.json`

### Phase 2: React Query Layer

1. **Create hooks**
   - `useYields` - Fetch list of yields
   - `useYield` - Fetch single yield with schema
   - `useYieldValidators` - Fetch validators
   - `useYieldBalances` - Fetch user balances
   - `useEnterYield` - Enter mutation
   - `useExitYield` - Exit mutation
   - `useManageYield` - Manage mutation
   - `useSignAndBroadcast` - Signing helper

### Phase 3: Components

1. **Main page**
   - `Yield.tsx` - Page container
   - `YieldFilters.tsx` - Network/provider filters

2. **Yield discovery**
   - `YieldList.tsx` - List container
   - `YieldCard.tsx` - Individual card
   - `YieldSkeleton.tsx` - Loading state

3. **User positions**
   - `YourPositions.tsx` - Positions container
   - `PositionCard.tsx` - Individual position

4. **Actions**
   - `YieldActionsModal.tsx` - Enter/exit modal
   - `YieldInputForm.tsx` - Dynamic form from schema
   - `TransactionStatus.tsx` - Signing progress

### Phase 4: Integration

1. **Add route**
   - Add to `src/Routes/RoutesCommon.tsx`
   - Add navigation icon

2. **Asset page integration**
   - Add yield opportunities section to `Equity.tsx` or new component
   - Show user's positions for the asset

3. **Update navigation**
   - Add to main nav if feature flag enabled

### Phase 5: Testing

1. **Unit tests**
   - API client tests
   - Hook tests
   - Component tests

2. **Integration tests**
   - Full transaction flow
   - Error handling
   - Wallet connection

---

## Integration Points

### Existing Components to Leverage

| Component | Purpose | How to Use |
|-----------|---------|-----------|
| `Dialog`, `DialogHeader`, etc. | Modal components | Reuse from `@/components/Modal/components/*` |
| `Card`, `CardBody`, `CardHeader` | Card containers | Chakra UI |
| `Button`, `Input`, `Select` | Form inputs | Chakra UI |
| `Skeleton` | Loading states | Chakra UI |
| `useWallet` | Wallet connection | `@/hooks/useWallet/useWallet` |
| `getChainAdapterManager()` | Chain adapters | `@/context/PluginProvider/chainAdapterSingleton` |
| `useTranslate` | i18n | `react-polyglot` |
| `Amount.Fiat`, `Amount.Crypto` | Display amounts | `@/components/Amount/Amount` |

### Route Registration

```typescript
// In src/Routes/RoutesCommon.tsx
import { Yield } from '@/pages/Yield/Yield'

const YieldPage = makeSuspenseful(
  lazy(() =>
    import('@/pages/Yield/Yield').then(({ Yield }) => ({
      default: Yield,
    })),
  ),
  {},
  true,
)

// In routes array:
{
  path: '/yield/*',
  label: 'navBar.yield',
  icon: <YieldIcon />,
  main: YieldPage,
  category: RouteCategory.Featured,
  priority: 5,
  mobileNav: true,
}
```

### Asset Page Integration

```typescript
// In src/components/Equity/Equity.tsx or new component
const { data: yieldBalances } = useYieldBalancesForAsset(assetId, walletAddress)

{yieldBalances && yieldBalances.length > 0 && (
  <YieldPositionsSection
    assetId={assetId}
    balances={yieldBalances}
    onManage={(balance) => openManageModal(balance)}
  />
)}
```

---

## Environment Configuration

### .env

```env
# Yield.xyz API
VITE_YIELD_XYZ_API_KEY=your_api_key_here
```

### .env.development

```env
# Use development API key for testing
VITE_YIELD_XYZ_API_KEY=dev_api_key_here
```

### .env.production

```env
# Production API key
VITE_YIELD_XYZ_API_KEY=prod_api_key_here
```

### Configuration Validation

```typescript
// In src/config.ts
import { bool, str } from 'cast-ts'

export const getConfig = () => {
  return {
    VITE_YIELD_XYZ_API_KEY: str({
      default: '',
      env: 'VITE_YIELD_XYZ_API_KEY',
    }),
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/lib/yieldxyz/client.test.ts
import { yieldxyzClient } from './client'

describe('yieldxyzClient', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches yields', async () => {
    const result = await yieldxyzClient.getYields({ network: 'ethereum' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/yields?network=ethereum'),
      expect.any(Object)
    )
  })
})
```

### Integration Tests

```typescript
// src/pages/Yield/components/YieldCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { YieldCard } from './YieldCard'

describe('YieldCard', () => {
  const mockYield = {
    id: 'test-yield',
    metadata: { name: 'Lido ETH', logoURI: 'https://example.com/logo.png' },
    token: { symbol: 'ETH', decimals: 18 },
    network: 'ethereum',
    rewardRate: { total: 4.5, rateType: 'APR' as const, components: [] },
    providerId: 'lido',
    status: { enter: true, exit: true },
    mechanics: { arguments: { enter: { type: 'object', required: true, properties: {} } } },
  }

  it('renders yield info', () => {
    render(<YieldCard yieldItem={mockYield as any} onEnter={() => {}} />)
    expect(screen.getByText('Lido ETH')).toBeInTheDocument()
    expect(screen.getByText('4.50%')).toBeInTheDocument()
  })

  it('calls onEnter when deposit button clicked', () => {
    const onEnter = vi.fn()
    render(<YieldCard yieldItem={mockYield as any} onEnter={onEnter} />)
    fireEvent.click(screen.getByText('Deposit'))
    expect(onEnter).toHaveBeenCalledWith(mockYield)
  })
})
```

### E2E Testing Considerations

1. **Mock API responses** for consistent testing
2. **Test all chain types** (EVM, Cosmos, Solana)
3. **Test error scenarios** (network failure, insufficient funds, etc.)
4. **Test wallet disconnection** handling

---

## Rate Limits

| Plan | Rate Limit | OAV Limit |
|------|------------|-----------|
| Trial | 1 req/sec | 3 OAVs |
| Standard | 100 req/sec | 10 OAVs |
| Pro | 1,000+ req/sec | Unlimited |

**Note**: Requests are cached by React Query. Configure `staleTime` appropriately to avoid hitting rate limits.

---

## Security Considerations

1. **API Key Protection**: Never expose API key in client-side code for production
2. **Transaction Signing**: Always verify transaction details before signing
3. **Input Validation**: Validate all schema inputs before submission
4. **Error Handling**: Don't expose sensitive error details to users
5. **Geoblocking**: Respect geoblocking settings from Yield.xyz dashboard

---

## References

- **Yield.xyz Docs**: https://docs.yield.xyz/
- **API Reference**: https://reference.yield.xyz/
- **Dashboard**: https://dashboard.stakek.it/
- **Chain Adapters**: https://github.com/shapeshiftoss/caip
- **HDWallet Core**: https://github.com/shapeshiftoss/hdwallet

---

## Empirical API Findings

> These findings are from live API testing during the spike phase. They document actual API behavior vs. documentation.

### Response Format Discrepancies

| Documentation | Actual API Response |
|---------------|---------------------|
| `GET /v1/yields` returns `YieldDto[]` | Returns `{ items: YieldDto[], total: number, offset: number, limit: number }` |
| Schema uses `properties: {}` object | Schema uses `fields: []` array |

**Actual yields response structure:**
```json
{
  "items": [...],
  "total": 15,
  "offset": 0,
  "limit": 5
}
```

**Actual schema structure (v2 API):**
```json
{
  "arguments": {
    "enter": {
      "fields": [
        {
          "name": "amount",
          "type": "string", 
          "label": "Amount",
          "description": "Enter the amount of tokens to stake, unstake, or transact with. Must be a valid decimal number.",
          "required": true,
          "placeholder": "0.0",
          "minimum": "0",
          "maximum": null,
          "isArray": false
        },
        {
          "name": "receiverAddress",
          "type": "string",
          "label": "Receiver Wallet Address",
          "required": false,
          "placeholder": "Select a receiver wallet address...",
          "isArray": false
        },
        {
          "name": "feeConfigurationId",
          "type": "string",
          "label": "Fee Configuration",
          "required": false,
          "optionsRef": "feeConfigurations",
          "options": ["4e17b495-d380-4cd2-b433-7125f477a39c"],
          "isArray": false
        }
      ]
    }
  }
}
```

**Key changes from v1**:
- Nested under `mechanics.arguments.enter/exit` 
- Fields include `description`, `placeholder`, `isArray`, `minimum`, `maximum`
- Fee configuration via `optionsRef: "feeConfigurations"` with `options` array
- More detailed validation metadata

### Transaction Format

Critical finding: `unsignedTransaction` is returned as a **JSON string** embedded in the JSON response:

```json
{
  "transactions": [
    {
      "id": "5d009819-367c-4da8-a3b4-7e95dd76093a",
      "title": "APPROVAL Transaction",
      "network": "base",
      "type": "APPROVAL",
      "unsignedTransaction": "{\"from\":\"0x...\",\"to\":\"0x...\",\"data\":\"0x...\",\"nonce\":162,\"type\":2,\"maxFeePerGas\":\"0x7ec9b6\",\"maxPriorityFeePerGas\":\"0x0f4240\",\"chainId\":8453}",
      "stepIndex": 0,
      "gasEstimate": "{\"amount\":\"0.000000523547945760\",\"gasLimit\":\"56240\",...}"
    }
  ]
}
```

**Must parse `unsignedTransaction` before use:**
```typescript
const txData = JSON.parse(transaction.unsignedTransaction)
// Now access: txData.to, txData.data, txData.value, etc.
```

### Balances Endpoint

The balances endpoint requires explicit `network` parameter:

```json
// POST /v1/yields/balances
{
  "queries": [
    {
      "address": "0xYourWalletAddress",
      "network": "base"
    }
  ]
}
```

Returns nested structure:
```json
{
  "items": [
    {
      "yieldId": "base-usdc-aave-v3-lending",
      "balances": [...]
    }
  ],
  "errors": []
}
```

### Supported Mechanic Types

Based on API testing, the following `mechanics.type` values are observed:

| Type | Description | Examples |
|------|-------------|----------|
| `vault` | ERC4626 vault strategies | Spark USDC, Seamless USDC |
| `lending` | DeFi lending protocols | Aave v3, Compound |
| `restaking` | Liquid restaking | Renzo, KelpDAO |

### Fee Configuration

- `optionsRef: "feeConfigurations"` appears in schemas for yields with configurable fees
- Actual fee configuration endpoint returned 404 in testing
- Fee configuration is likely project-level, not accessible via API

### API Key Access Restrictions

Testing revealed that **network access is determined by API key configuration**:

| Network | Yields Found |
|---------|--------------|
| Base | 15 |
| Ethereum | 0 |
| Arbitrum | 0 |
| Optimism | 0 |
| Polygon | 0 |
| Solana | 0 |

This appears to be an API key permission issue, not a format problem. The API key used for testing had Base-only access.

> **Note**: @0xApotheosis has requested permissions for an actual Yield.xyz account. Once approved, this will provide a full API key with access to all networks and yields. For now, Base-only access is sufficient for spike/prototyping purposes.

### Verified Working Endpoints

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /v1/yields?network=base` | ✅ Works | Returns `{items: [], total, offset, limit}` |
| `GET /v1/yields?provider=aave` | ✅ Works | Filters correctly |
| `GET /v1/yields/{yieldId}` | ✅ Works | Full yield details |
| `GET /v1/networks` | ✅ Works | Lists all available networks |
| `POST /v1/yields/balances` | ✅ Works | Requires network in query |
| `POST /v1/actions/enter` | ✅ Works | Returns action + transactions array |
| `POST /v1/actions/exit` | ✅ Works | Requires passthrough from balances |
| `POST /v1/transactions/{id}/submit` | ✅ Works | Submit signed tx, Yield.xyz broadcasts |
| `PUT /v1/transactions/{id}/submit-hash` | ✅ Works | Track self-broadcasted tx |
| `GET /v1/fee-configurations` | ❌ 404 | Project-level config (dashboard only) |

### Action Flow (Verified)

1. **Create action**: `POST /v1/actions/enter` with `yieldId`, `address`, `arguments`
   ```json
   // Request
   {
     "yieldId": "base-usdc-aave-v3-lending",
     "address": "0xYourWalletAddress",
     "arguments": { "amount": "10" }
   }
   
   // Response
   {
     "id": "c828f90f-99b6-4909-b89e-195fa044775d",
     "type": "STAKE",
     "status": "CREATED",
     "transactions": [
       {
         "id": "ae4fc1be-4488-4b3d-a6b1-a34bc416c444",
         "title": "APPROVAL Transaction",
         "type": "APPROVAL",
         "unsignedTransaction": "{\"from\":\"0x...\",\"to\":\"0x...\",\"data\":\"0x...\"}",
         "stepIndex": 0
       },
       {
         "id": "...",
         "title": "STAKE Transaction", 
         "type": "STAKE",
         "stepIndex": 1
       }
     ]
   }
   ```

2. **Parse & sign transactions**: Parse JSON string from `unsignedTransaction`, sign with wallet

3. **Broadcast** (two options):
   
   **Option A: Yield.xyz broadcasts for you**
   ```bash
   POST /v1/transactions/{transactionId}/submit
   {
     "signedTransaction": "0x..."  # Signed hex string
   }
   ```
   - They call `eth_sendRawTransaction` on your behalf
   - Automatic status tracking
   - Simpler integration
   
   **Option B: You broadcast directly**
   ```bash
   # 1. Broadcast to chain yourself via RPC
   # 2. Then notify Yield.xyz for tracking
   PUT /v1/transactions/{transactionId}/submit-hash
   {
     "hash": "0x..."  # Transaction hash
   }
   ```
   - Full control over RPC endpoint
   - You handle retries/gas bumps
   - Manual tracking submission

**Recommendation**: Use Option A (let Yield.xyz broadcast) for simpler integration. Use Option B if you need custom RPC endpoints or advanced transaction management.

---

## API Endpoint Reference (Tested & Verified)

### Discovery Endpoints

#### GET /v1/yields
Lists all available yield opportunities with filters.

**Query Parameters:**
- `network` (optional): Filter by network (e.g., `base`, `ethereum`)
- `provider` (optional): Filter by provider (e.g., `aave`, `morpho`)
- `limit` (optional): Pagination limit (default: 10)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```typescript
{
  items: YieldDto[],      // Array of yield opportunities
  total: number,          // Total count
  offset: number,         // Current offset
  limit: number           // Current limit
}
```

**Reference:** [GET /v1/yields](https://docs.yield.xyz/reference/yieldscontroller_getyields)

#### GET /v1/yields/{yieldId}
Get detailed metadata for a specific yield.

**Response:** Full `YieldDto` with nested `mechanics.arguments` schemas

**Reference:** [GET /v1/yields/{yieldId}](https://docs.yield.xyz/reference/yieldscontroller_getyield)

#### GET /v1/networks
List all supported networks.

**Response:** Array of `{id, name, category, logoURI}`

**Reference:** [GET /v1/networks](https://docs.yield.xyz/reference/networkscontroller_getnetworks)

---

### Balance Endpoints

#### POST /v1/yields/balances
Get balances across multiple yields and networks (batch query).

**Request:**
```typescript
{
  queries: Array<{
    address: string,      // Wallet address
    network: string,      // Network ID (required)
    yieldId?: string      // Optional: specific yield, omit to scan all yields on network
  }>
}
```

**Response:**
```typescript
{
  items: Array<{
    yieldId: string,
    balances: BalanceDto[]
  }>,
  errors: Array<any>
}
```

**Reference:** [POST /v1/yields/balances](https://docs.yield.xyz/reference/yieldscontroller_getaggregatebalances)

#### POST /v1/yields/{yieldId}/balances
Get balances for a specific yield (simpler than batch).

**Request:**
```typescript
{
  address: string,        // Wallet address
  arguments?: object      // Optional: yield-specific args
}
```

**Response:** 
```typescript
{
  yieldId: string,
  balances: Array<{
    address: string,
    amount: string,          // Human-readable amount
    amountRaw: string,       // Base units
    amountUsd: string,       // USD value
    type: "active" | "entering" | "exiting" | "withdrawable" | "claimable" | "locked",
    token: TokenDto,         // The balance token (e.g., aBasUSDC for Aave)
    isEarning: boolean,      // Whether actively earning yield
    pendingActions: Array<{
      type: string,          // "CLAIM_REWARDS", "RESTAKE_REWARDS", etc.
      passthrough: string,   // Opaque token - REQUIRED for manage action
      arguments?: object     // Optional schema for action
    }>
  }>
}
```

**Note:** Returns balance structure even for 0 amounts, which is useful for UX (showing available yields).

**Reference:** [POST /v1/yields/{yieldId}/balances](https://docs.yield.xyz/reference/yieldscontroller_getyieldbalances)

---

### Action Endpoints

#### POST /v1/actions/enter
Create a new yield position (stake, lend, deposit).

**Request:**
```typescript
{
  yieldId: string,
  address: string,        // User's wallet address
  arguments: {
    amount: string,       // Amount in human-readable units (e.g., "10" for 10 USDC)
    validatorAddress?: string,  // For validator-based yields
    receiverAddress?: string,   // For ERC4626 vaults
    feeConfigurationId?: string // Optional fee tier
    // ...other yield-specific fields from schema
  }
}
```

**Response:**
```typescript
{
  id: string,             // Action ID
  type: string,           // "STAKE", "LEND", etc.
  status: "CREATED",
  transactions: TransactionDto[]  // Unsigned transactions to sign
}
```

**Reference:** [POST /v1/actions/enter](https://docs.yield.xyz/reference/actionscontroller_enteryield)

#### POST /v1/actions/exit
Exit a yield position (unstake, withdraw).

**Request:**
```typescript
{
  yieldId: string,
  address: string,
  arguments: {
    amount?: string,      // Amount to withdraw
    useMaxAmount?: boolean  // For ERC4626 max withdraw
    // ...other yield-specific fields
  }
}
```

**Response:** Same as enter (ActionDto with transactions)

**Reference:** [POST /v1/actions/exit](https://docs.yield.xyz/reference/actionscontroller_exityield)

#### POST /v1/actions/manage
Perform management actions (claim, restake, redelegate).

**Request:**
```typescript
{
  yieldId: string,
  address: string,
  action: string,         // "CLAIM_REWARDS", "RESTAKE_REWARDS", "REDELEGATE", etc.
  passthrough: string,    // REQUIRED: opaque token from pendingActions in balance
  arguments?: object      // Optional: action-specific args (e.g., new validator)
}
```

**Response:** Same as enter (ActionDto with transactions)

**Reference:** [POST /v1/actions/manage](https://docs.yield.xyz/reference/actionscontroller_manageyield)

---

### Transaction Submission Endpoints

#### POST /v1/transactions/{transactionId}/submit
Submit signed transaction for Yield.xyz to broadcast.

**Request:**
```typescript
{
  signedTransaction: string  // Hex-encoded signed transaction (e.g., "0x...")
}
```

**Response:** Transaction status update

**Reference:** [POST /v1/transactions/{id}/submit](https://docs.yield.xyz/reference/transactionscontroller_submittransaction)

#### PUT /v1/transactions/{transactionId}/submit-hash
Submit transaction hash after self-broadcasting.

**Request:**
```typescript
{
  hash: string  // Transaction hash from blockchain
}
```

**Response:** Transaction status update for tracking

**Reference:** [PUT /v1/transactions/{id}/submit-hash](https://docs.yield.xyz/reference/transactionscontroller_submittransactionhash)

---

## Enhanced Documentation Findings (from docs.yield.xyz deep dive)

### Key Insights Beyond Initial Analysis

#### 1. Transaction Submission Options (Two Paths)

The API offers TWO ways to handle transaction broadcasting:

**Path A: Yield.xyz broadcasts for you** (Recommended for simplicity)
1. Call `/v1/actions/{intent}` → get unsigned transactions with IDs
2. Sign with your wallet infrastructure
3. Submit signed tx: `POST /v1/transactions/{transactionId}/submit` with `{signedTransaction: "0x..."}`
4. Yield.xyz calls `eth_sendRawTransaction` and handles status tracking automatically

**Path B: You broadcast directly** (For advanced control)
1. Call `/v1/actions/{intent}` → get unsigned transactions
2. Sign with your wallet infrastructure  
3. Broadcast to blockchain RPC yourself
4. Notify Yield.xyz: `PUT /v1/transactions/{transactionId}/submit-hash` with `{hash: "0x..."}`

**Why use Path A?**
- Simpler integration (one less step)
- Automatic status tracking
- They handle RPC endpoint selection
- Built-in retry logic

**Why use Path B?**
- Custom RPC endpoints (e.g., Alchemy, Infura with your keys)
- Advanced transaction management (gas bumping, custom retries)
- Full control over broadcast timing

#### 2. Non-EVM Transaction Structures

From official docs, transaction construction differs significantly by chain:

| Chain | Transaction Structure |
|-------|----------------------|
| **Solana** | Additional `SystemProgram.transfer` instruction for fees bundled atomically |
| **Cosmos** | `MsgSend` proto message bundled with `MsgDelegate` in same tx |
| **TON** | Additional "cell" bundled (TON allows up to 4 messages per tx) |
| **Cardano** | Transaction output bundled with delegation certificate |
| **Tron** | **Non-atomic** - separate fee tx must be signed first (UX consideration!) |

#### 3. FeeWrapper Contract Details

For EVM chains, the FeeWrapper is:
- **ERC-4626 compliant** - preserves composability
- **Audited by Zellic** - [Audit Report](https://github.com/Zellic/publications/blob/master/StakeKit%20FeeWrapper%20-%20Zellic%20Audit%20Report.pdf)
- **Demo deployment**: [0xb32d6e11ee9e13db1a2ceec071feb7ece1d255c1](https://etherscan.io/address/0xb32d6e11ee9e13db1a2ceec071feb7ece1d255c1)

Fee configuration is **project-level** via dashboard, not API - explains the 404 on fee-configurations endpoint.

#### 4. Balance Lifecycle States (Complete)

| State | Description | Can Exit? | Earning? |
|-------|-------------|-----------|----------|
| `active` | Currently staked/deployed | Yes | ✅ Yes |
| `entering` | Deposit in progress | No | ❌ No |
| `exiting` | Unstaking/cooldown | No | Varies |
| `withdrawable` | Ready to withdraw | Yes | ❌ No |
| `claimable` | Rewards available | Yes (claim) | N/A |
| `locked` | Vesting/restricted | No | Varies |

#### 5. Pending Actions & Passthrough Token

Critical pattern: `pendingActions` from balances include an **opaque `passthrough` string** that MUST be included when calling `/v1/actions/manage`. This is how the API tracks position state server-side.

```typescript
// From balance response
pendingActions: [{
  type: 'CLAIM_REWARDS',
  passthrough: 'eyJhY3Rpb25JZCI6...',  // Opaque - don't parse
  arguments: { /* optional schema */ }
}]

// When executing
POST /v1/actions/manage
{
  yieldId: '...',
  address: '...',
  action: 'CLAIM_REWARDS',
  passthrough: 'eyJhY3Rpb25JZCI6...',  // Must include!
  arguments: {}
}
```

#### 6. Allocator Vaults (OAVs) vs Base Yields

Two integration options:
1. **Base Yields** - Direct protocol interaction, no fees, full composability
2. **OAVs (Optimized Allocator Vaults)** - Wrapped strategies with:
   - Performance/Management fees
   - Auto-compounding
   - Multi-strategy allocation
   - True APY (TAPY) calculation including slippage

For MVP, **Base Yields** are simpler - skip OAVs initially.

#### 7. `@stakekit/signers` Package

Official signing package supports:
- MetaMask, Phantom, Keplr, Temple, Omni, SteakWallet derivation paths
- All supported networks (EVM + Cosmos + Solana + TON + etc.)
- Can be used as reference but **ShapeShift already has chain adapters** - prefer those

---

## Relationship to Existing DeFi Abstraction

### Old DeFi Abstraction = Completely Separate Domain

The existing `opportunitiesSlice` with its `DefiProvider` enum, resolvers, and RTK patterns is **legacy code** that will remain untouched. The Yield.xyz implementation is:

- **100% standalone** - no integration with `opportunitiesSlice` whatsoever
- **Different domain** - old defi = old defi, Yield.xyz = new thing entirely
- **No shared state** - separate React Query cache, no Redux for yield data
- **No shared abstractions** - no resolvers, no provider enums, no type mappings

### What We Might Reuse (Stylistically Only)

- Some UI components/patterns for visual consistency (cards, tables, modals)
- Maybe bits of component API patterns (but much simpler)
- Chakra UI theming/color mode support

### What We're Absolutely NOT Reusing

- `DefiProvider` enum or any additions to it
- `opportunitiesSlice` or its resolvers
- `DefiType` abstractions
- RTK Query patterns from old defi
- The entire resolver/provider architecture

---

## Implementation Approach

### Pure React Query (No Redux)

```typescript
// Simple query hooks - no Redux, no resolvers
export const useYields = (filters?: YieldFilters) => {
  return useQuery({
    queryKey: ['yieldxyz', 'yields', filters],
    queryFn: () => yieldxyzClient.getYields(filters),
    staleTime: 60_000,
  })
}

export const useYieldBalances = (address: string, networks?: string[]) => {
  return useQuery({
    queryKey: ['yieldxyz', 'balances', address, networks],
    queryFn: () => yieldxyzClient.getAllBalances({ address, networks }),
    enabled: !!address,
  })
}
```

### Simple Mutations

```typescript
export const useEnterYield = () => {
  return useMutation({
    mutationFn: (data: EnterYieldInput) => yieldxyzClient.enterYield(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'balances'] })
    }
  })
}
```

### What We ARE Doing

1. ✅ Pure React Query for all Yield.xyz data
2. ✅ Direct API client (simple fetch wrapper)
3. ✅ Leverage existing chain adapters for signing
4. ✅ Schema-driven forms from API response
5. ✅ Simple, flat component structure
6. ✅ No abstractions - direct and obvious code

---

## Summary

This implementation provides:

1. **Clean separation** of concerns (API client, React Query hooks, components)
2. **Schema-driven UI** that automatically adapts to Yield.xyz API changes
3. **Multi-chain support** via chain adapters
4. **Self-custody** transaction signing
5. **Reusable components** following existing patterns
6. **Full integration** with asset pages
7. **No Redux complexity** - pure React Query for simplicity

The implementation is designed to be minimal, maintainable, and extensible as Yield.xyz adds new features and networks.
