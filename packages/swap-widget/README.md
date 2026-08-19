# @shapeshiftoss/swap-widget

An embeddable React widget that enables multi-chain token swaps using ShapeShift's aggregation API. Drop it into your app to offer EVM, UTXO, and Solana swaps with minimal configuration.

> **This README is the canonical reference for the swap widget.** Other docs (including the ShapeShift Public API docs) link here.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Wallet Connection](#wallet-connection)
- [Props Reference](#props-reference)
- [Filtering Chains and Assets](#filtering-chains-and-assets)
- [Exact Output and Locked Destinations](#exact-output-and-locked-destinations)
- [Theming](#theming)
- [Examples](#examples)
- [Exported Types](#exported-types)
- [Exported Utilities](#exported-utilities)
- [Exported Hooks](#exported-hooks)
- [Supported Chains](#supported-chains)
- [Supported Swappers](#supported-swappers)
- [Partner Codes & Affiliate Revenue](#partner-codes--affiliate-revenue)
- [Notes and Limitations](#notes-and-limitations)

## Installation

```bash
npm install @shapeshiftoss/swap-widget
```

### Peer Dependencies

The widget relies on React, wagmi/viem, React Query, and Reown AppKit (used internally for wallet
connection). The widget initializes AppKit with the EVM, Bitcoin, and Solana adapters at load, so all
of these peers are required — install them alongside the package:

```bash
npm install react react-dom \
  wagmi @wagmi/core viem \
  @tanstack/react-query \
  @reown/appkit @reown/appkit-adapter-wagmi \
  @reown/appkit-adapter-bitcoin @reown/appkit-adapter-solana \
  @solana/wallet-adapter-phantom @solana/wallet-adapter-solflare @solana/web3.js
```

- **React 18 or 19** is supported (`^18.0.0 || ^19.0.0`).

### Import the stylesheet

The widget ships a stylesheet that **must** be imported once for it to render correctly:

```tsx
import '@shapeshiftoss/swap-widget/style.css'
```

## Quick Start

```tsx
import '@shapeshiftoss/swap-widget/style.css'

import { SwapWidget } from '@shapeshiftoss/swap-widget'

function App() {
  return (
    <SwapWidget
      // Initializes the built-in wallet connection. Optional if your app already
      // initializes Reown AppKit — see "Wallet Connection" below.
      walletConnectProjectId="your-walletconnect-project-id"
      // Optional: attribute swaps to your affiliate account.
      partnerCode="your-partner-code"
      theme="dark"
      onSwapSuccess={txHash => console.log('Success:', txHash)}
      onSwapError={error => console.error('Error:', error)}
    />
  )
}
```

## Wallet Connection

The widget connects wallets through [Reown AppKit](https://reown.com/appkit)
and provides the `WagmiProvider` / `QueryClient` it needs — you don't wrap it in your own.

### Initializing AppKit

**The widget renders nothing until AppKit is initialized.** There are two ways to satisfy this:

- **Let the widget initialize AppKit (default).** Pass `walletConnectProjectId` and the widget creates
  and owns its own AppKit instance. Get a free project ID at <https://dashboard.reown.com>.

  ```tsx
  <SwapWidget walletConnectProjectId="your-walletconnect-project-id" />
  ```

- **Reuse your app's existing AppKit.** If your host app already calls `createAppKit()` (with a wagmi
  EVM adapter), omit `walletConnectProjectId`. The widget detects the shared AppKit singleton, reads the
  wagmi config off it, and provides its own `WagmiProvider` / `QueryClient` from that config — **you wrap
  the widget in no providers of your own.** Pair this with `showConnectButton={false}` to drive
  connection entirely from your own UI. See `src/demo/ExternalWalletApp.tsx` for a full host example.

  Two requirements for this mode:

  - **Initialize AppKit _before_ the widget mounts.** The widget reads the AppKit singleton when it
    mounts and does not poll for late initialization — if AppKit isn't up yet, the widget renders nothing.
  - **Dedupe the AppKit/wagmi packages.** `@reown/appkit*`, `wagmi`, and `viem` must resolve to a single
    shared copy in your app, so the widget and your app share one AppKit instance and one wagmi state. A
    duplicated copy means the widget reads an empty store and shows no connection.

The header shows a built-in **Connect** button by default; set `showConnectButton={false}` to hide it
and drive connection from your own UI.

### Supported wallet namespaces

Once connected, the widget can sign and broadcast transactions for three wallet namespaces:

| Namespace | Chains                          | Example wallets                  |
| --------- | ------------------------------- | -------------------------------- |
| `eip155`  | All supported EVM chains        | MetaMask, WalletConnect, Rabby   |
| `bip122`  | Bitcoin and other UTXO chains   | WalletConnect-compatible wallets |
| `solana`  | Solana                          | Phantom, Solflare                |

The header shows a **Connect** button by default (toggle with `showConnectButton`) that opens the
AppKit modal. Swaps whose sell asset is not in an executable namespace (see
[Supported Chains](#supported-chains)) redirect to [app.shapeshift.com](https://app.shapeshift.com)
when `allowShapeshiftRedirect` is enabled.

## Props Reference

### `SwapWidgetProps`

| Prop                     | Type                                            | Default            | Description                                                                                              |
| ------------------------ | ----------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `walletConnectProjectId` | `string`                                        | –                  | Reown AppKit / WalletConnect project ID. The widget uses it to initialize AppKit. Required unless your host app already initializes AppKit (see [Wallet Connection](#wallet-connection)). |
| `partnerCode`            | `string`                                        | –                  | Your registered partner code for affiliate fee attribution. See [Partner Codes](#partner-codes--affiliate-revenue). |
| `apiBaseUrl`             | `string`                                        | `https://api.shapeshift.com` | Override the API base URL. Useful for testing or custom deployments.                           |
| `defaultSellAsset`       | `Asset`                                         | ETH on Ethereum    | Initial asset to sell.                                                                                    |
| `defaultBuyAsset`        | `Asset`                                         | USDC on Ethereum   | Initial asset to buy.                                                                                     |
| `sellFilters`            | `SwapWidgetFilters`                             | `{}`               | Restrict which chains/assets are selectable for the **sell** side. See [Filtering](#filtering-chains-and-assets). |
| `buyFilters`             | `SwapWidgetFilters`                             | `{}`               | Restrict which chains/assets are selectable for the **buy** side.                                        |
| `allowedSwapperNames`    | `SwapperName[]`                                 | all enabled        | Limit quotes to specific swappers. See [Supported Swappers](#supported-swappers).                        |
| `allowShapeshiftRedirect`| `boolean`                                       | `true`             | When a swap isn't executable in-widget, redirect to app.shapeshift.com instead of hiding it.             |
| `isBuyAssetLocked`       | `boolean`                                       | `false`            | Prevent the user from changing the buy asset.                                                            |
| `defaultBuyAmountCryptoBaseUnit` | `string`                                | –                  | Drive the trade from the buy side: the user receives exactly this amount and the sell amount is derived. Restricts routing to exact-output swappers. See [Exact Output and Locked Destinations](#exact-output-and-locked-destinations). |
| `isBuyAmountLocked`      | `boolean`                                       | `false`            | Prevent the user from changing the buy amount. When an amount is supplied it also locks the buy asset, since a base-unit amount is meaningless without the asset it counts. |
| `defaultReceiveAddress`  | `string`                                        | –                  | Prefill the destination address. Falls back to the connected wallet's address for the buy chain when unset. |
| `isReceiveAddressLocked` | `boolean`                                       | `false`            | Prevent the user from changing the destination address.                                                   |
| `theme`                  | `ThemeMode \| ThemeConfig`                      | `"dark"`           | Theme mode (`"light"` or `"dark"`) or a full theme configuration object. See [Theming](#theming).        |
| `defaultSlippage`        | `string`                                        | `"0.5"`            | Default slippage tolerance, as a percentage string.                                                      |
| `showPoweredBy`          | `boolean`                                       | `true`             | Show the "Powered by ShapeShift" footer.                                                                  |
| `showConnectButton`      | `boolean`                                       | `true`             | Show the built-in Connect button in the widget header.                                                   |
| `ratesRefetchInterval`   | `number`                                        | `15000`            | How often (ms) to refetch swap rates.                                                                    |
| `onSwapSuccess`          | `(txHash: string) => void`                      | –                  | Called when a swap transaction succeeds.                                                                  |
| `onSwapError`            | `(error: Error) => void`                        | –                  | Called when a swap transaction fails.                                                                     |

## Filtering Chains and Assets

Restrict the sell and/or buy asset selectors independently via the `sellFilters` and `buyFilters`
props. Both accept the same shape:

```typescript
type SwapWidgetFilters = {
  allowedChainIds?: ChainId[] // If set, only these chains are selectable
  disabledChainIds?: ChainId[] // Hide these chains
  allowedAssetIds?: AssetId[] // If set, only these assets are selectable
  disabledAssetIds?: AssetId[] // Hide these assets
}
```

```tsx
import { EVM_CHAIN_IDS, SwapWidget } from '@shapeshiftoss/swap-widget'

function App() {
  return (
    <SwapWidget
      walletConnectProjectId="your-walletconnect-project-id"
      partnerCode="your-partner-code"
      // Only allow selling ETH-chain, Polygon, and Arbitrum assets
      sellFilters={{
        allowedChainIds: [EVM_CHAIN_IDS.ethereum, EVM_CHAIN_IDS.polygon, EVM_CHAIN_IDS.arbitrum],
      }}
      // Hide a specific buy token
      buyFilters={{
        disabledAssetIds: ['eip155:1/erc20:0x...'],
      }}
      theme="dark"
    />
  )
}
```

## Exact Output and Locked Destinations

By default the user enters what they want to spend. These props invert that, and fix where the funds
land — letting you configure the widget for one specific swap.

### Fixed receive amount

`defaultBuyAmountCryptoBaseUnit` drives the trade from the buy side. The user still chooses what to
sell, but the sell amount comes back derived from whichever route they pick.

```tsx
<SwapWidget
  walletConnectProjectId="..."
  defaultBuyAsset={usdcOnBase}
  defaultBuyAmountCryptoBaseUnit="500000" // 0.5 USDC, in base units
  isBuyAmountLocked
/>
```

Without `isBuyAmountLocked` the amount is only a **prefill**: both fields stay editable, and
whichever one the user types into becomes the side that drives the trade — the other is then derived
from the selected route. Adding the lock fixes the buy amount, and makes the sell field read-only,
since typing there would clear the amount you locked.

Because a base-unit amount only means something alongside the asset it counts, `isBuyAmountLocked`
locks the buy asset too. Changing an unlocked buy asset keeps the entered amount and recalculates its
base units at the new precision, matching how the sell side already behaves.

Only swappers that can honour an exact output are routed to — currently **NEAR Intents** and
**Relay**. The rest report `ExactOutputNotSupported` and are left out of the rate list, so expect
fewer routes than a normal swap, and none at all for pairs those two don't cover.

Slippage applies to the **sell** side. The amount received is fixed; what varies is what it costs.

### Fixed destination

`defaultReceiveAddress` prefills the destination. Add `isReceiveAddressLocked` to stop the user
changing it — the locked address then outranks both a user entry and the connected wallet's own
address.

| Props                        | Behaviour                          |
| ---------------------------- | ---------------------------------- |
| `defaultReceiveAddress` only | Prefilled, user can still edit it   |
| Both                         | Locked to the address you supplied  |

A locked address is checked against the buy asset's chain, and if it doesn't validate there the
widget says so and blocks the swap rather than falling back to the connected wallet — paying the
user's own address is never what a locked destination meant. This is reachable whenever the buy
asset is left unlocked, since the user can switch to a chain the address doesn't belong to.

An **unlocked** prefill is checked the same way but fails quietly: one that doesn't match the buy
chain is dropped, and the connected wallet's address takes over as if you had passed nothing. Verify
a prefill against the chain of the buy asset you pair it with.

A lock is only accepted alongside the value it locks — `isReceiveAddressLocked` on its own is a type
error, as is `isBuyAmountLocked` without `defaultBuyAmountCryptoBaseUnit`. Locking with nothing to
lock would fall back to the connected wallet's address, which is undefined whenever the wallet
doesn't cover the buy asset's chain, leaving no address and no way to enter one.

If you build props dynamically, import `ReceiveAddressProps` and `BuyAmountProps` and construct each
pair together:

```tsx
const receiveAddressProps: ReceiveAddressProps = address
  ? { defaultReceiveAddress: address, isReceiveAddressLocked: true }
  : {}

<SwapWidget {...receiveAddressProps} />
```

### Payment mode

Locking **both** the buy amount and the address — `defaultBuyAmountCryptoBaseUnit` with
`isBuyAmountLocked`, plus `defaultReceiveAddress` with `isReceiveAddressLocked` — puts the widget in
**payment mode**: a set amount, sent to an address you supplied.

```tsx
<SwapWidget
  walletConnectProjectId="..."
  defaultBuyAsset={usdcOnBase}
  defaultBuyAmountCryptoBaseUnit="500000"
  isBuyAmountLocked
  defaultReceiveAddress="0x…"
  isReceiveAddressLocked
  onSwapSuccess={txHash => recordPayment(txHash)}
/>
```

The success screen is then terminal — no "New Swap" button. Repeating a payment means paying twice,
so whether there's another swap is your call rather than the widget's; use `onSwapSuccess` to decide
what happens next.

Locking only **one** of the two stays repeatable, and keeps the button: a set amount sent to the
user's own wallet, or topping up a locked address again, are both things a user may reasonably do
twice.
`isBuyAssetLocked` never affects this — restricting swaps to a given token is just a configuration.

### Redirects are disabled by either lock

The app.shapeshift.com redirect carries neither the destination nor the buy amount, so following it
would drop whichever constraint you set. Locking the buy amount **or** the receive address
therefore disables it outright: `allowShapeshiftRedirect` has no effect, and assets on
non-executable chains drop out of the asset pickers rather than dead-ending. The pickers share that
filter, so Cosmos-SDK assets go from the **buy** side too, even though a swap into them works — only
the sell side needs a signature. The remaining redirect-only chains lose nothing: the widget has no
address validator for them, so they were never usable as a destination.

Note this is a wider condition than payment mode — locking either one is enough, because a single
dropped constraint can send funds somewhere you didn't intend.

### Configuration is applied at mount

Every `default*` prop is applied a single time, when the widget mounts — the same semantics as
`defaultValue` on an `<input>`. After that the value belongs to the user, so changing the prop on an
already mounted widget has no effect, and neither does resolving it asynchronously: if you fetch
`Asset` objects, hold off rendering until you have them.

**Locked values are the exception.** A locked value is yours rather than the user's, so it tracks its
prop rather than seeding once — change `defaultBuyAmountCryptoBaseUnit` alongside `isBuyAmountLocked`,
or `defaultReceiveAddress` alongside `isReceiveAddressLocked`, and the widget follows without a
remount. Both apply while the user is on the input step. Once they've asked for a quote a change may
not land at all — that quote carries the amount and address it was built with — so change them
before the user starts, or remount. `defaultBuyAsset` seeds once even when `isBuyAssetLocked`.

To change anything else, or to start a fresh swap after a payment completes, **remount**.
If the widget lives in a modal that unmounts its children while closed, that happens for free:

```tsx
{isOpen && <SwapWidget onSwapSuccess={() => setIsOpen(false)} {...config} />}
```

Inline — or in a modal that keeps its children mounted — bump a `key` instead:

```tsx
const [swapSession, setSwapSession] = useState(0)

<SwapWidget
  key={swapSession}
  onSwapSuccess={txHash => {
    recordSwap(txHash)
    setSwapSession(n => n + 1)
  }}
  {...config}
/>
```

Remounting is cheap. The AppKit instance and the React Query cache are module-level singletons
rather than widget state, so the user stays connected and asset and balance data isn't refetched —
only the swap itself resets.

### Refunds

If a swap can't be completed, the provider returns the funds to the **sending** address — the wallet
the user swapped from — not to the receive address. A locked destination does not affect where a
refund goes.

## Theming

The widget supports a simple light/dark mode or a full theme configuration object.

### Simple theme mode

```tsx
<SwapWidget walletConnectProjectId="..." theme="dark" />
// or
<SwapWidget walletConnectProjectId="..." theme="light" />
```

### Custom theme configuration

```tsx
import { SwapWidget } from '@shapeshiftoss/swap-widget'
import type { ThemeConfig } from '@shapeshiftoss/swap-widget'

const customTheme: ThemeConfig = {
  mode: 'dark', // required
  accentColor: '#3861fb',
  backgroundColor: '#0a0a14',
  cardColor: '#12121c',
  textColor: '#ffffff',
  borderRadius: '12px',
  fontFamily: 'Inter, sans-serif',
  buttonVariant: 'filled',
}

function App() {
  return <SwapWidget walletConnectProjectId="..." theme={customTheme} />
}
```

### `ThemeConfig` properties

| Property             | Type                     | Description                                          |
| -------------------- | ------------------------ | ---------------------------------------------------- |
| `mode`               | `"light" \| "dark"`      | Base theme mode. **Required.**                       |
| `accentColor`        | `string`                 | Primary accent color (buttons, focus states).        |
| `backgroundColor`    | `string`                 | Widget background color.                              |
| `cardColor`          | `string`                 | Card / panel background color.                        |
| `textColor`          | `string`                 | Primary text color.                                  |
| `secondaryTextColor` | `string`                 | Secondary text color.                                |
| `mutedTextColor`     | `string`                 | Muted/tertiary text color.                            |
| `inputColor`         | `string`                 | Input field background color.                         |
| `hoverColor`         | `string`                 | Hover background color.                               |
| `borderColor`        | `string`                 | Border color.                                        |
| `borderRadius`       | `string`                 | Base border radius for UI elements (e.g. `"12px"`).   |
| `fontFamily`         | `string`                 | Font family for the widget.                           |
| `buttonVariant`      | `"filled" \| "outline"`  | Primary button style.                                 |

## Examples

### Basic usage

```tsx
import { SwapWidget } from '@shapeshiftoss/swap-widget'

function App() {
  return <SwapWidget walletConnectProjectId="..." partnerCode="your-partner-code" theme="dark" />
}
```

### Custom default assets

```tsx
import { SwapWidget } from '@shapeshiftoss/swap-widget'
import type { Asset } from '@shapeshiftoss/swap-widget'

const defaultSellAsset: Asset = {
  assetId: 'eip155:137/slip44:966',
  chainId: 'eip155:137',
  symbol: 'POL',
  name: 'Polygon',
  precision: 18,
}

const defaultBuyAsset: Asset = {
  assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  chainId: 'eip155:137',
  symbol: 'USDC',
  name: 'USD Coin',
  precision: 6,
}

function App() {
  return (
    <SwapWidget
      walletConnectProjectId="..."
      partnerCode="your-partner-code"
      defaultSellAsset={defaultSellAsset}
      defaultBuyAsset={defaultBuyAsset}
      theme="dark"
    />
  )
}
```

### Locking the buy asset

Use `isBuyAssetLocked` so users can only change the sell side — useful when you want all swaps to
end in a specific token.

```tsx
<SwapWidget
  walletConnectProjectId="..."
  partnerCode="your-partner-code"
  defaultBuyAsset={defaultBuyAsset}
  isBuyAssetLocked
  theme="dark"
/>
```

## Exported Types

```typescript
import type {
  Asset,
  AssetId,
  BuyAmountProps,
  Chain,
  ChainId,
  ReceiveAddressProps,
  SwapWidgetFilters,
  SwapWidgetProps,
  ThemeConfig,
  ThemeMode,
  TradeQuote,
  TradeRate,
} from '@shapeshiftoss/swap-widget'
```

`SwapperName` is exported as a runtime value (an `enum`) — import it from the value position, not as
a type.

### `Asset`

```typescript
type Asset = {
  assetId: AssetId // CAIP-19, e.g. "eip155:1/slip44:60"
  chainId: ChainId // CAIP-2, e.g. "eip155:1"
  symbol: string // e.g. "ETH"
  name: string // e.g. "Ethereum"
  precision: number // e.g. 18
  icon?: string
  color?: string
  networkName?: string
  networkIcon?: string
  explorer?: string
  explorerTxLink?: string
  explorerAddressLink?: string
  relatedAssetKey?: AssetId | null
}
```

## Exported Utilities

```typescript
import {
  COSMOS_CHAIN_IDS,
  EVM_CHAIN_IDS,
  OTHER_CHAIN_IDS,
  REDIRECT_ONLY_CHAIN_IDS,
  SwapperName,
  UTXO_CHAIN_IDS,
  formatAmount,
  getBaseAsset,
  getChainColor,
  getChainIcon,
  getChainName,
  getChainType,
  getEvmNetworkId,
  getExplorerTxLink,
  isEvmChainId,
  isWidgetExecutableChainId,
  isWidgetSupportedChainId,
  parseAmount,
  truncateAddress,
} from '@shapeshiftoss/swap-widget'
```

### Chain helpers

| Function                    | Signature                                                                 | Description                                                  |
| --------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `isEvmChainId`              | `(chainId: string) => boolean`                                            | Whether a chain ID is an EVM chain.                          |
| `getEvmNetworkId`           | `(chainId: string) => number`                                             | Extract the numeric network ID from a CAIP-2 EVM chain ID.   |
| `getChainType`              | `(chainId: string) => "evm" \| "utxo" \| "cosmos" \| "solana" \| "other"` | Classify a chain by namespace.                               |
| `isWidgetSupportedChainId`  | `(chainId: string) => boolean`                                            | Whether the widget lists assets on this chain.               |
| `isWidgetExecutableChainId` | `(chainId: string) => boolean`                                            | Whether the widget can sign/execute swaps on this chain in-app. |
| `getChainName`              | `(chainId: ChainId) => string`                                            | Display name for a chain.                                    |
| `getChainIcon`              | `(chainId: ChainId) => string \| undefined`                               | Icon URL for a chain.                                        |
| `getChainColor`            | `(chainId: ChainId) => string`                                            | Brand color for a chain.                                     |
| `getBaseAsset`              | `(chainId: ChainId) => Asset \| undefined`                                | Native asset for a chain.                                    |
| `getExplorerTxLink`         | `(chainId: ChainId) => string \| undefined`                               | Block-explorer transaction link template.                   |

### Amount and address formatting

| Function          | Signature                                                            | Description                                          |
| ----------------- | -------------------------------------------------------------------- | ---------------------------------------------------- |
| `formatAmount`    | `(amount: string, decimals: number, maxDecimals?: number) => string` | Format a base-unit amount for display.               |
| `parseAmount`     | `(amount: string, decimals: number) => string`                       | Parse a human-readable amount into base units.       |
| `truncateAddress` | `(address: string, chars?: number) => string`                        | Truncate an address (e.g. `0x1234...5678`).          |

### Chain ID constants

```typescript
const EVM_CHAIN_IDS = {
  ethereum: 'eip155:1',
  arbitrum: 'eip155:42161',
  optimism: 'eip155:10',
  polygon: 'eip155:137',
  base: 'eip155:8453',
  avalanche: 'eip155:43114',
  bsc: 'eip155:56',
  gnosis: 'eip155:100',
  monad: 'eip155:143',
  megaEth: 'eip155:4326',
  hyperEvm: 'eip155:999',
  plasma: 'eip155:9745',
  katana: 'eip155:747474',
}

const UTXO_CHAIN_IDS = {
  bitcoin: 'bip122:000000000019d6689c085ae165831e93',
  bitcoinCash: 'bip122:000000000000000000651ef99cb9fcbe',
  dogecoin: 'bip122:00000000001a91e3dace36e2be3bf030',
  litecoin: 'bip122:12a765e31ffd4059bada1e25190f6e98',
}

const COSMOS_CHAIN_IDS = {
  cosmos: 'cosmos:cosmoshub-4',
  thorchain: 'cosmos:thorchain-1',
  mayachain: 'cosmos:mayachain-mainnet-v1',
}

const OTHER_CHAIN_IDS = {
  solana: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
}

// Listed in the asset selector, but swaps redirect to app.shapeshift.com (not executed in-widget)
const REDIRECT_ONLY_CHAIN_IDS = {
  zcash: 'bip122:00040fe8ec8471911baa1db1266ea15d',
  tron: 'tron:0x2b6653dc',
  sui: 'sui:35834a8a',
  ton: 'ton:mainnet',
  near: 'near:mainnet',
  starknet: 'starknet:SN_MAIN',
}
```

## Exported Hooks

```typescript
import {
  useAssetById,
  useAssetSearch,
  useAssets,
  useAssetsByChainId,
  useChains,
} from '@shapeshiftoss/swap-widget'
```

| Hook                              | Description                                                     |
| --------------------------------- | -------------------------------------------------------------- |
| `useAssets()`                     | Fetch all available assets.                                    |
| `useAssetById(assetId)`           | Fetch a single asset by ID.                                    |
| `useChains()`                     | Fetch all available chains with their native assets.           |
| `useAssetsByChainId(chainId)`     | Fetch all assets for a specific chain.                         |
| `useAssetSearch(query, chainId?)` | Search assets by symbol or name, optionally filtered by chain. |

These hooks must be used within a mounted `<SwapWidget />` tree (they rely on the widget's internal
React Query client).

## Supported Chains

Assets on the following chains appear in the selector. Swaps are **executed in-widget** only for EVM,
UTXO, and Solana assets (`isWidgetExecutableChainId` returns `true`). Cosmos-SDK and redirect-only
chains are selectable but route the user to [app.shapeshift.com](https://app.shapeshift.com) to
complete the swap (when `allowShapeshiftRedirect` is enabled).

| Chain             | Chain ID                                  | Type   | Executable in-widget |
| ----------------- | ----------------------------------------- | ------ | -------------------- |
| Ethereum          | `eip155:1`                                | EVM    | ✅                   |
| Arbitrum One      | `eip155:42161`                            | EVM    | ✅                   |
| Optimism          | `eip155:10`                               | EVM    | ✅                   |
| Polygon           | `eip155:137`                              | EVM    | ✅                   |
| Base              | `eip155:8453`                             | EVM    | ✅                   |
| Avalanche C-Chain | `eip155:43114`                            | EVM    | ✅                   |
| BNB Smart Chain   | `eip155:56`                               | EVM    | ✅                   |
| Gnosis            | `eip155:100`                              | EVM    | ✅                   |
| Monad             | `eip155:143`                              | EVM    | ✅                   |
| MegaETH           | `eip155:4326`                             | EVM    | ✅                   |
| HyperEVM          | `eip155:999`                              | EVM    | ✅                   |
| Plasma            | `eip155:9745`                             | EVM    | ✅                   |
| Katana            | `eip155:747474`                           | EVM    | ✅                   |
| Bitcoin           | `bip122:000000000019d6689c085ae165831e93` | UTXO   | ✅                   |
| Bitcoin Cash      | `bip122:000000000000000000651ef99cb9fcbe` | UTXO   | ✅                   |
| Dogecoin          | `bip122:00000000001a91e3dace36e2be3bf030` | UTXO   | ✅                   |
| Litecoin          | `bip122:12a765e31ffd4059bada1e25190f6e98` | UTXO   | ✅                   |
| Solana            | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | Solana | ✅                   |
| Cosmos Hub        | `cosmos:cosmoshub-4`                      | Cosmos | ↗ redirect           |
| THORChain         | `cosmos:thorchain-1`                      | Cosmos | ↗ redirect           |
| MAYAChain         | `cosmos:mayachain-mainnet-v1`             | Cosmos | ↗ redirect           |
| Zcash, Tron, Sui, TON, NEAR, Starknet | _see `REDIRECT_ONLY_CHAIN_IDS`_ | Other | ↗ redirect    |

## Supported Swappers

The widget aggregates quotes across the protocols below and surfaces the best rate. Use
`allowedSwapperNames` to restrict which are used.

- **NEAR Intents** (`SwapperName.NearIntents`)
- **Relay** (`SwapperName.Relay`)
- **THORChain** (`SwapperName.Thorchain`)
- **MAYAChain** (`SwapperName.Mayachain`)

> The set of enabled swappers changes over time. Treat this list as current-at-publish; the
> authoritative source is the `SwapperName` enum exported by this package.

## Partner Codes & Affiliate Revenue

Pass your registered `partnerCode` to attribute swaps to your affiliate account and earn revenue
share. The widget forwards it to the ShapeShift Public API as the `X-Partner-Code` header, and the
API applies your configured fee automatically.

```tsx
<SwapWidget walletConnectProjectId="..." partnerCode="your-partner-code" />
```

See the [Affiliate Program guide](../../docs/affiliates.md) for how to obtain a partner code and how
revenue attribution works.

## Notes and Limitations

- **Self-contained providers.** The widget renders its own `WagmiProvider` and React Query
  `QueryClient`. Don't wrap it in your own — and remember it renders nothing until AppKit is
  initialized, whether by `walletConnectProjectId` or by your host app (see [Wallet Connection](#wallet-connection)).
- **Balances and USD prices.** When a wallet is connected, the widget shows balances and USD prices
  for the selected assets.
- **Redirects.** Assets on non-executable chains (Cosmos, Zcash, Tron, Sui, TON, NEAR, Starknet)
  send the user to app.shapeshift.com to finish the swap, unless `allowShapeshiftRedirect={false}`
  or the buy amount or receive address is locked (see
  [Redirects are disabled by either lock](#redirects-are-disabled-by-either-lock)).
- **Configuration is applied at mount.** `default*` props are read once; locked values keep
  tracking their prop. Remount to change anything else, or to start a fresh swap. See
  [Configuration is applied at mount](#configuration-is-applied-at-mount).
- **`onSwapSuccess` reports the sell transaction.** The hash it receives is the transaction the user
  signed on the sell chain. On cross-chain routes the destination transfer may still be in flight.
- **Mobile responsive.** The widget is designed to work on mobile as well as desktop.
