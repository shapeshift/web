# @shapeshiftoss/swap-widget-poc

An embeddable React widget that enables multi-chain token swaps using ShapeShift's aggregation API. Integrate swaps into your application with minimal configuration.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Props Reference](#props-reference)
- [Theming](#theming)
- [Examples](#examples)
- [Exported Types](#exported-types)
- [Exported Utilities](#exported-utilities)
- [Exported Hooks](#exported-hooks)
- [Supported Chains](#supported-chains)
- [Notes and Limitations](#notes-and-limitations)

## Installation

```bash
yarn add @shapeshiftoss/swap-widget-poc
# or
npm install @shapeshiftoss/swap-widget-poc
```

### Peer Dependencies

This package requires React 18 or later:

```json
{
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  }
}
```

## Quick Start

```tsx
import { SwapWidget } from "@shapeshiftoss/swap-widget-poc";

function App() {
  return (
    <SwapWidget
      apiKey="your-api-key"
      theme="dark"
      onSwapSuccess={(txHash) => console.log("Success:", txHash)}
      onSwapError={(error) => console.error("Error:", error)}
    />
  );
}
```

## Props Reference

### SwapWidgetProps

| Prop               | Type                                            | Default          | Description                                                              |
| ------------------ | ----------------------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| `apiKey`           | `string`                                        | -                | ShapeShift API key for fetching swap rates. Required for production use. |
| `apiBaseUrl`       | `string`                                        | -                | Custom API base URL. Useful for testing or custom deployments.           |
| `defaultSellAsset` | `Asset`                                         | ETH on Ethereum  | Initial asset to sell.                                                   |
| `defaultBuyAsset`  | `Asset`                                         | USDC on Ethereum | Initial asset to buy.                                                    |
| `disabledChainIds` | `ChainId[]`                                     | `[]`             | Chain IDs to hide from the asset selector.                               |
| `disabledAssetIds` | `AssetId[]`                                     | `[]`             | Asset IDs to hide from the asset selector.                               |
| `allowedChainIds`  | `ChainId[]`                                     | -                | If provided, only show assets from these chains.                         |
| `allowedAssetIds`  | `AssetId[]`                                     | -                | If provided, only show these specific assets.                            |
| `walletClient`     | `WalletClient`                                  | -                | Viem wallet client for executing EVM transactions.                       |
| `onConnectWallet`  | `() => void`                                    | -                | Callback when user clicks "Connect Wallet" button.                       |
| `onSwapSuccess`    | `(txHash: string) => void`                      | -                | Callback when a swap transaction succeeds.                               |
| `onSwapError`      | `(error: Error) => void`                        | -                | Callback when a swap transaction fails.                                  |
| `onAssetSelect`    | `(type: "sell" \| "buy", asset: Asset) => void` | -                | Callback when user selects an asset.                                     |
| `theme`            | `ThemeMode \| ThemeConfig`                      | `"dark"`         | Theme mode (`"light"` or `"dark"`) or full theme configuration.          |
| `defaultSlippage`  | `string`                                        | `"0.5"`          | Default slippage tolerance percentage.                                   |
| `showPoweredBy`    | `boolean`                                       | `true`           | Show "Powered by ShapeShift" branding.                                   |

## Theming

The widget supports both simple theme modes and full customization.

### Simple Theme Mode

```tsx
<SwapWidget theme="dark" />
// or
<SwapWidget theme="light" />
```

### Custom Theme Configuration

```tsx
import { SwapWidget } from "@shapeshiftoss/swap-widget-poc";
import type { ThemeConfig } from "@shapeshiftoss/swap-widget-poc";

const customTheme: ThemeConfig = {
  mode: "dark",
  accentColor: "#3861fb", // Primary accent color (buttons, focus states)
  backgroundColor: "#0a0a14", // Widget background
  cardColor: "#12121c", // Card/panel background
  textColor: "#ffffff", // Primary text color
  borderRadius: "12px", // Border radius for elements
  fontFamily: "Inter, sans-serif",
};

function App() {
  return <SwapWidget theme={customTheme} />;
}
```

### ThemeConfig Properties

| Property          | Type                | Description                                        |
| ----------------- | ------------------- | -------------------------------------------------- |
| `mode`            | `"light" \| "dark"` | Base theme mode. Required.                         |
| `accentColor`     | `string`            | Primary accent color for buttons and focus states. |
| `backgroundColor` | `string`            | Widget background color.                           |
| `cardColor`       | `string`            | Card and panel background color.                   |
| `textColor`       | `string`            | Primary text color.                                |
| `borderRadius`    | `string`            | Border radius for UI elements.                     |
| `fontFamily`      | `string`            | Font family for the widget.                        |

## Examples

### Basic Usage

```tsx
import { SwapWidget } from "@shapeshiftoss/swap-widget-poc";

function App() {
  return <SwapWidget apiKey="your-api-key" theme="dark" />;
}
```

### With Wallet Connection (wagmi/viem)

```tsx
import { SwapWidget } from "@shapeshiftoss/swap-widget-poc";
import { useWalletClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

function App() {
  const { data: walletClient } = useWalletClient();
  const { openConnectModal } = useConnectModal();

  return (
    <SwapWidget
      apiKey="your-api-key"
      walletClient={walletClient}
      onConnectWallet={openConnectModal}
      onSwapSuccess={(txHash) => {
        console.log("Swap successful:", txHash);
      }}
      onSwapError={(error) => {
        console.error("Swap failed:", error);
      }}
      theme={{
        mode: "dark",
        accentColor: "#3861fb",
        backgroundColor: "#0a0a14",
        cardColor: "#12121c",
      }}
    />
  );
}
```

### With Custom Default Assets

```tsx
import { SwapWidget } from "@shapeshiftoss/swap-widget-poc";
import type { Asset } from "@shapeshiftoss/swap-widget-poc";

const defaultSellAsset: Asset = {
  assetId: "eip155:137/slip44:966",
  chainId: "eip155:137",
  symbol: "MATIC",
  name: "Polygon",
  precision: 18,
  icon: "https://example.com/matic.png",
};

const defaultBuyAsset: Asset = {
  assetId: "eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
  chainId: "eip155:137",
  symbol: "USDC",
  name: "USD Coin",
  precision: 6,
  icon: "https://example.com/usdc.png",
};

function App() {
  return (
    <SwapWidget
      apiKey="your-api-key"
      defaultSellAsset={defaultSellAsset}
      defaultBuyAsset={defaultBuyAsset}
      theme="dark"
    />
  );
}
```

### Restricting Available Chains and Assets

```tsx
import { SwapWidget, EVM_CHAIN_IDS } from "@shapeshiftoss/swap-widget-poc";

function App() {
  return (
    <SwapWidget
      apiKey="your-api-key"
      allowedChainIds={[
        EVM_CHAIN_IDS.ethereum,
        EVM_CHAIN_IDS.polygon,
        EVM_CHAIN_IDS.arbitrum,
      ]}
      disabledAssetIds={[
        "eip155:1/erc20:0x...", // Hide specific tokens
      ]}
      theme="dark"
    />
  );
}
```

## Exported Types

```typescript
import type {
  Asset,
  AssetId,
  ChainId,
  Chain,
  TradeRate,
  TradeQuote,
  SwapperName,
  SwapWidgetProps,
  ThemeMode,
  ThemeConfig,
} from "@shapeshiftoss/swap-widget-poc";
```

### Asset

```typescript
type Asset = {
  assetId: AssetId; // CAIP-19 format: "eip155:1/slip44:60"
  chainId: ChainId; // CAIP-2 format: "eip155:1"
  symbol: string; // e.g., "ETH"
  name: string; // e.g., "Ethereum"
  precision: number; // e.g., 18
  icon?: string; // URL to asset icon
  color?: string; // Brand color
  networkName?: string; // Display name for the network
  networkIcon?: string; // URL to network icon
  explorer?: string; // Block explorer URL
  explorerTxLink?: string; // Transaction explorer link template
  explorerAddressLink?: string; // Address explorer link template
  relatedAssetKey?: AssetId | null; // Related asset for bridged tokens
};
```

### SwapperName

```typescript
type SwapperName =
  | "THORChain"
  | "MAYAChain"
  | "CoW Swap"
  | "0x"
  | "Portals"
  | "Chainflip"
  | "Relay"
  | "Bebop"
  | "Jupiter"
  | "1inch"
  | "ButterSwap"
  | "ArbitrumBridge";
```

### TradeRate

```typescript
type TradeRate = {
  swapperName: SwapperName;
  rate: string;
  buyAmountCryptoBaseUnit: string;
  sellAmountCryptoBaseUnit: string;
  steps: number;
  estimatedExecutionTimeMs?: number;
  affiliateBps: string;
  networkFeeCryptoBaseUnit?: string;
  error?: {
    code: string;
    message: string;
  };
  id?: string;
};
```

## Exported Utilities

```typescript
import {
  isEvmChainId,
  getEvmChainIdNumber,
  getChainType,
  formatAmount,
  parseAmount,
  truncateAddress,
  EVM_CHAIN_IDS,
  UTXO_CHAIN_IDS,
  COSMOS_CHAIN_IDS,
  OTHER_CHAIN_IDS,
  CHAIN_METADATA,
  getChainMeta,
  getChainName,
  getChainIcon,
  getChainColor,
} from "@shapeshiftoss/swap-widget-poc";
```

### Chain Type Utilities

| Function              | Signature                                                                 | Description                                          |
| --------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| `isEvmChainId`        | `(chainId: string) => boolean`                                            | Check if a chain ID is an EVM chain.                 |
| `getEvmChainIdNumber` | `(chainId: string) => number`                                             | Extract the numeric chain ID from a CAIP-2 chain ID. |
| `getChainType`        | `(chainId: string) => "evm" \| "utxo" \| "cosmos" \| "solana" \| "other"` | Get the chain type from a chain ID.                  |

### Amount Formatting

| Function          | Signature                                                            | Description                                              |
| ----------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| `formatAmount`    | `(amount: string, decimals: number, maxDecimals?: number) => string` | Format a base unit amount for display.                   |
| `parseAmount`     | `(amount: string, decimals: number) => string`                       | Parse a human-readable amount to base units.             |
| `truncateAddress` | `(address: string, chars?: number) => string`                        | Truncate an address for display (e.g., `0x1234...5678`). |

### Chain Metadata

| Function        | Signature                                      | Description                       |
| --------------- | ---------------------------------------------- | --------------------------------- |
| `getChainMeta`  | `(chainId: ChainId) => ChainMeta \| undefined` | Get full metadata for a chain.    |
| `getChainName`  | `(chainId: ChainId) => string`                 | Get the display name for a chain. |
| `getChainIcon`  | `(chainId: ChainId) => string \| undefined`    | Get the icon URL for a chain.     |
| `getChainColor` | `(chainId: ChainId) => string`                 | Get the brand color for a chain.  |

### Chain ID Constants

```typescript
const EVM_CHAIN_IDS = {
  ethereum: "eip155:1",
  arbitrum: "eip155:42161",
  arbitrumNova: "eip155:42170",
  optimism: "eip155:10",
  polygon: "eip155:137",
  base: "eip155:8453",
  avalanche: "eip155:43114",
  bsc: "eip155:56",
  gnosis: "eip155:100",
};

const UTXO_CHAIN_IDS = {
  bitcoin: "bip122:000000000019d6689c085ae165831e93",
  bitcoinCash: "bip122:000000000000000000651ef99cb9fcbe",
  dogecoin: "bip122:00000000001a91e3dace36e2be3bf030",
  litecoin: "bip122:12a765e31ffd4059bada1e25190f6e98",
};

const COSMOS_CHAIN_IDS = {
  cosmos: "cosmos:cosmoshub-4",
  thorchain: "cosmos:thorchain-1",
  mayachain: "cosmos:mayachain-mainnet-v1",
};

const OTHER_CHAIN_IDS = {
  solana: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
};
```

## Exported Hooks

```typescript
import {
  useAssets,
  useAssetById,
  useChains,
  useAssetsByChainId,
  useAssetSearch,
} from "@shapeshiftoss/swap-widget-poc";
```

| Hook                              | Return Type                                | Description                                                    |
| --------------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| `useAssets()`                     | `{ data: Asset[], isLoading, error, ... }` | Fetch all available assets.                                    |
| `useAssetById(assetId)`           | `{ data: Asset \| undefined, ... }`        | Fetch a specific asset by ID.                                  |
| `useChains()`                     | `{ data: ChainInfo[], ... }`               | Fetch all available chains with their native assets.           |
| `useAssetsByChainId(chainId)`     | `{ data: Asset[], ... }`                   | Fetch all assets for a specific chain.                         |
| `useAssetSearch(query, chainId?)` | `{ data: Asset[], ... }`                   | Search assets by symbol or name, optionally filtered by chain. |

## Supported Chains

| Chain             | Chain ID                                  | Type   |
| ----------------- | ----------------------------------------- | ------ |
| Ethereum          | `eip155:1`                                | EVM    |
| Arbitrum One      | `eip155:42161`                            | EVM    |
| Arbitrum Nova     | `eip155:42170`                            | EVM    |
| Optimism          | `eip155:10`                               | EVM    |
| Polygon           | `eip155:137`                              | EVM    |
| Base              | `eip155:8453`                             | EVM    |
| Avalanche C-Chain | `eip155:43114`                            | EVM    |
| BNB Smart Chain   | `eip155:56`                               | EVM    |
| Gnosis            | `eip155:100`                              | EVM    |
| Bitcoin           | `bip122:000000000019d6689c085ae165831e93` | UTXO   |
| Bitcoin Cash      | `bip122:000000000000000000651ef99cb9fcbe` | UTXO   |
| Dogecoin          | `bip122:00000000001a91e3dace36e2be3bf030` | UTXO   |
| Litecoin          | `bip122:12a765e31ffd4059bada1e25190f6e98` | UTXO   |
| Cosmos Hub        | `cosmos:cosmoshub-4`                      | Cosmos |
| THORChain         | `cosmos:thorchain-1`                      | Cosmos |
| MAYAChain         | `cosmos:mayachain-mainnet-v1`             | Cosmos |
| Solana            | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | Solana |

## Notes and Limitations

### EVM vs Non-EVM Swaps

- **EVM swaps** (e.g., ETH to USDC, MATIC to WETH) can be executed directly within the widget when a wallet is connected via the `walletClient` prop.
- **Non-EVM swaps** (e.g., BTC to ETH, SOL to USDC) redirect the user to [app.shapeshift.com](https://app.shapeshift.com) to complete the transaction. This is because non-EVM chains require different wallet types.

### API Key

An API key is required for fetching swap rates in production. Contact ShapeShift for API access.

### Internal QueryClient

The widget manages its own React Query `QueryClient` internally. You do not need to wrap it in a `QueryClientProvider`.

### Swap Aggregation

The widget fetches quotes from multiple DEXs and aggregators including:

- THORChain
- MAYAChain
- CoW Swap
- 0x
- 1inch
- Portals
- Chainflip
- Jupiter (Solana)
- Bebop
- Relay
- ButterSwap
- Arbitrum Bridge

### Wallet Balance Display

When a wallet is connected (`walletClient` prop), the widget displays the user's balance for the selected sell and buy assets. This only works for EVM chains where the connected wallet has assets.

### USD Price Display

The widget automatically fetches and displays USD prices for selected assets.

### Mobile Responsive

The widget is designed to be responsive and works well on mobile devices.
