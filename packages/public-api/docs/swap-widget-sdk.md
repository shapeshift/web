The `@shapeshiftoss/swap-widget` package is a drop-in React component that provides a complete swap interface. It handles asset selection, rate comparison, wallet connection, transaction signing, and status tracking.

## Installation

```bash
npm install @shapeshiftoss/swap-widget
# or
yarn add @shapeshiftoss/swap-widget
```

**Peer dependencies** (install alongside the widget):

```bash
npm install react react-dom
```

**CSS** — You must import the widget stylesheet:

```tsx
import '@shapeshiftoss/swap-widget/style.css'
```

## Quick Start

```tsx
import { SwapWidget } from '@shapeshiftoss/swap-widget'
import '@shapeshiftoss/swap-widget/style.css'

function App() {
  return (
    <SwapWidget
      partnerCode="your-partner-code"
      theme="dark"
      onSwapSuccess={(txHash) => console.log('Success:', txHash)}
    />
  )
}
```

---

## Wallet Connection Modes

The widget supports two wallet connection strategies. Choose the one that matches your application.

### Mode 1: External Wallet (Recommended for dApps)

**Use this if your application already has a wallet connection** (wagmi, ethers, viem, RainbowKit, ConnectKit, AppKit, etc.). Pass the connected wallet to the widget — no duplicate wallet modals.

```tsx
import { SwapWidget } from '@shapeshiftoss/swap-widget'
import '@shapeshiftoss/swap-widget/style.css'
import { useWalletClient } from 'wagmi'

function SwapPage() {
  const { data: walletClient } = useWalletClient()

  return (
    <SwapWidget
      walletClient={walletClient}
      partnerCode="your-partner-code"
      onConnectWallet={() => {
        // Trigger YOUR app's wallet connection modal
        openYourConnectModal()
      }}
      theme="dark"
    />
  )
}
```

| Prop | Purpose |
|------|---------|
| `walletClient` | A viem `WalletClient` from your existing wallet setup |
| `onConnectWallet` | Called when the user clicks "Connect" inside the widget — open your own modal |
| `enableWalletConnection` | Leave as `false` (default) — the widget won't render its own connect UI |

This mode creates its own read-only wagmi config internally for balance fetching. It does **not** interfere with your application's wagmi provider or AppKit instance.

### Mode 2: Built-in Wallet Connection (Standalone)

**Use this if your page has no wallet infrastructure.** The widget manages wallet connections internally via Reown AppKit, supporting EVM, Bitcoin, and Solana wallets.

```tsx
import { SwapWidget } from '@shapeshiftoss/swap-widget'
import '@shapeshiftoss/swap-widget/style.css'

function App() {
  return (
    <SwapWidget
      enableWalletConnection={true}
      walletConnectProjectId="your-project-id"
      partnerCode="your-partner-code"
      theme="dark"
    />
  )
}
```

Get a WalletConnect project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com).

When `enableWalletConnection` is true, the widget:
- Shows a "Connect" button that opens a multi-chain wallet modal
- Supports MetaMask, WalletConnect, Coinbase Wallet, and other EVM wallets
- Supports Bitcoin wallets via WalletConnect
- Supports Phantom, Solflare, and other Solana wallets

> **Important: AppKit Singleton Constraint**
>
> The built-in wallet connection uses Reown AppKit, which is a **global singleton** — only one AppKit instance can exist per page. If your page already uses AppKit or Web3Modal, the widget's modal will conflict with yours.
>
> **If your dApp already has AppKit/Web3Modal**: Use **Mode 1 (External Wallet)** instead. Pass your connected `walletClient` to the widget and handle wallet connection yourself.
>
> **If your page has no wallet setup**: Mode 2 works perfectly — the widget is the only AppKit instance on the page.

---

## Props Reference

### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `partnerCode` | `string` | — | Your registered partner code for affiliate fee attribution. Register at the affiliate dashboard. |
| `apiBaseUrl` | `string` | — | Custom API base URL |
| `theme` | `ThemeMode \| ThemeConfig` | `"dark"` | Theme mode or full theme configuration |
| `showPoweredBy` | `boolean` | `true` | Show "Powered by ShapeShift" branding |
| `defaultSlippage` | `string` | `"0.5"` | Default slippage tolerance percentage |
| `ratesRefetchInterval` | `number` | `15000` | Rate refresh interval in milliseconds |

### Wallet Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `walletClient` | `WalletClient` | — | Viem wallet client for EVM transactions (Mode 1) |
| `enableWalletConnection` | `boolean` | `false` | Enable built-in wallet modal (Mode 2) |
| `walletConnectProjectId` | `string` | — | Required for Mode 2 |
| `onConnectWallet` | `() => void` | — | Callback when user clicks "Connect" (Mode 1) |
| `defaultReceiveAddress` | `string` | — | Lock the receive address to a specific value |

### Asset Filtering Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultSellAsset` | `Asset` | ETH | Initial sell asset |
| `defaultBuyAsset` | `Asset` | USDC | Initial buy asset |
| `allowedChainIds` | `ChainId[]` | all | Restrict both sides to these chains |
| `disabledChainIds` | `ChainId[]` | `[]` | Hide chains from both selectors |
| `disabledAssetIds` | `AssetId[]` | `[]` | Hide assets from both selectors |
| `sellAllowedChainIds` | `ChainId[]` | — | Restrict sell side to these chains |
| `buyAllowedChainIds` | `ChainId[]` | — | Restrict buy side to these chains |
| `sellAllowedAssetIds` | `AssetId[]` | — | Restrict sell side to these assets |
| `buyAllowedAssetIds` | `AssetId[]` | — | Restrict buy side to these assets |
| `sellDisabledChainIds` | `ChainId[]` | `[]` | Hide chains from sell selector |
| `buyDisabledChainIds` | `ChainId[]` | `[]` | Hide chains from buy selector |
| `sellDisabledAssetIds` | `AssetId[]` | `[]` | Hide assets from sell selector |
| `buyDisabledAssetIds` | `AssetId[]` | `[]` | Hide assets from buy selector |
| `allowedSwapperNames` | `SwapperName[]` | all | Restrict to specific swappers |
| `isBuyAssetLocked` | `boolean` | `false` | Prevent changing the buy asset |

### Callback Props

| Prop | Type | Description |
|------|-------|-------------|
| `onSwapSuccess` | `(txHash: string) => void` | Called when a swap succeeds |
| `onSwapError` | `(error: Error) => void` | Called when a swap fails |
| `onAssetSelect` | `(type: 'sell' \| 'buy', asset: Asset) => void` | Called when user selects an asset |

---

## Theming

### Simple Mode

```tsx
<SwapWidget theme="dark" />
<SwapWidget theme="light" />
```

### Custom Theme

```tsx
const theme: ThemeConfig = {
  mode: 'dark',
  accentColor: '#3861fb',
  backgroundColor: '#0a0a14',
  cardColor: '#12121c',
  textColor: '#ffffff',
  borderRadius: '12px',
  fontFamily: 'Inter, sans-serif',
  borderColor: '#2a2a3e',
  secondaryTextColor: '#a0a0b0',
  mutedTextColor: '#6b6b80',
  inputColor: '#1a1a2e',
  hoverColor: '#1e1e32',
  buttonVariant: 'filled', // 'filled' or 'outline'
}

<SwapWidget theme={theme} />
```

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `'light' \| 'dark'` | Base theme mode (required) |
| `accentColor` | `string` | Buttons, focus states, active elements |
| `backgroundColor` | `string` | Widget background |
| `cardColor` | `string` | Card and panel backgrounds |
| `textColor` | `string` | Primary text |
| `borderRadius` | `string` | Border radius (e.g. `'12px'`) |
| `fontFamily` | `string` | Font family |
| `borderColor` | `string` | Border colors |
| `secondaryTextColor` | `string` | Secondary labels |
| `mutedTextColor` | `string` | Muted/disabled text |
| `inputColor` | `string` | Input field background |
| `hoverColor` | `string` | Hover state background |
| `buttonVariant` | `'filled' \| 'outline'` | Button style |

---

## Integration Examples

### Restrict to Ethereum + Polygon Only

```tsx
import { SwapWidget, EVM_CHAIN_IDS } from '@shapeshiftoss/swap-widget'

<SwapWidget
  allowedChainIds={[EVM_CHAIN_IDS.ethereum, EVM_CHAIN_IDS.polygon]}
  partnerCode="your-partner-code"
  theme="dark"
/>
```

### Lock Buy Asset (Payment Widget)

```tsx
const usdcAsset = {
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: 'eip155:1',
  symbol: 'USDC',
  name: 'USD Coin',
  precision: 6,
}

<SwapWidget
  defaultBuyAsset={usdcAsset}
  isBuyAssetLocked={true}
  defaultReceiveAddress="0xYourTreasuryAddress"
  partnerCode="your-partner-code"
  theme="dark"
/>
```

### Use Specific Swappers Only

```tsx
import { SwapWidget, SwapperName } from '@shapeshiftoss/swap-widget'

<SwapWidget
  allowedSwapperNames={[SwapperName.Thorchain, SwapperName.Chainflip]}
  theme="dark"
/>
```

---

## Exported Hooks

These hooks can be used outside the widget to build custom UI with ShapeShift asset data.

```tsx
import {
  useAssets,
  useAssetById,
  useChains,
  useAssetsByChainId,
  useAssetSearch,
} from '@shapeshiftoss/swap-widget'
```

| Hook | Return Type | Description |
|------|-------------|-------------|
| `useAssets()` | `{ data: Asset[], isLoading, ... }` | All available assets |
| `useAssetById(assetId)` | `{ data: Asset \| undefined, ... }` | Single asset by CAIP-19 ID |
| `useChains()` | `{ data: ChainInfo[], ... }` | All chains with native assets |
| `useAssetsByChainId(chainId)` | `{ data: Asset[], ... }` | All assets on a chain |
| `useAssetSearch(query, chainId?)` | `{ data: Asset[], ... }` | Search by symbol or name |

All hooks return React Query result objects with `data`, `isLoading`, `error`, `refetch`, etc.

## Exported Utilities

```tsx
import {
  formatAmount,
  parseAmount,
  truncateAddress,
  isEvmChainId,
  getEvmNetworkId,
  getChainType,
  getChainName,
  getChainIcon,
  getChainColor,
  getBaseAsset,
  getExplorerTxLink,
  EVM_CHAIN_IDS,
  UTXO_CHAIN_IDS,
  COSMOS_CHAIN_IDS,
  OTHER_CHAIN_IDS,
} from '@shapeshiftoss/swap-widget'
```

---

## Supported Chains

The widget natively supports all EVM chains, Bitcoin, and Solana. Other chains (Cosmos, Starknet, NEAR, TON, Tron, Sui, etc.) are available via redirect to [app.shapeshift.com](https://app.shapeshift.com).

| Chain | Chain ID | Type |
|-------|----------|------|
| Ethereum | `eip155:1` | EVM |
| Arbitrum One | `eip155:42161` | EVM |
| Avalanche C-Chain | `eip155:43114` | EVM |
| Base | `eip155:8453` | EVM |
| Berachain | `eip155:80094` | EVM |
| Blast | `eip155:81457` | EVM |
| BNB Smart Chain | `eip155:56` | EVM |
| BOB | `eip155:60808` | EVM |
| Cronos | `eip155:25` | EVM |
| Flow EVM | `eip155:747` | EVM |
| Gnosis | `eip155:100` | EVM |
| Hemi | `eip155:43111` | EVM |
| HyperEVM | `eip155:999` | EVM |
| Ink | `eip155:57073` | EVM |
| Katana | `eip155:747474` | EVM |
| Linea | `eip155:59144` | EVM |
| Mantle | `eip155:5000` | EVM |
| MegaETH | `eip155:4326` | EVM |
| Mode | `eip155:34443` | EVM |
| Monad | `eip155:143` | EVM |
| Optimism | `eip155:10` | EVM |
| Plasma | `eip155:9745` | EVM |
| Plume | `eip155:98866` | EVM |
| Polygon | `eip155:137` | EVM |
| Scroll | `eip155:534352` | EVM |
| Soneium | `eip155:1868` | EVM |
| Sonic | `eip155:146` | EVM |
| Story | `eip155:1514` | EVM |
| Unichain | `eip155:130` | EVM |
| World Chain | `eip155:480` | EVM |
| zkSync Era | `eip155:324` | EVM |
| Bitcoin | `bip122:000000000019d6689c085ae165831e93` | UTXO |
| Solana | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | Solana |

## Supported Swappers (15)

THORChain, MAYAChain, CoW Swap, 0x, Portals, Chainflip, Jupiter, Relay, ButterSwap, Bebop, Arbitrum Bridge, NEAR Intents, Cetus, Sun.io, AVNU.

---

## Architecture Notes

**Internal QueryClient** — The widget manages its own React Query `QueryClient`. You do not need to wrap it in a `QueryClientProvider`.

**Wagmi Isolation** — In external wallet mode, the widget creates its own isolated read-only wagmi config for balance fetching. It does not interfere with your application's `WagmiProvider`.

**AppKit Singleton** — In built-in wallet mode (`enableWalletConnection=true`), the widget uses Reown AppKit which is a page-level singleton. Only one AppKit instance can exist per page. If your dApp already uses AppKit or Web3Modal, you **must** use external wallet mode instead.

**CSS Isolation** — All widget styles are prefixed with `ssw-` to avoid conflicts with host page styles. Import the stylesheet explicitly:

```tsx
import '@shapeshiftoss/swap-widget/style.css'
```
