The `@shapeshiftoss/swap-widget` package is a drop-in React component that provides a complete swap interface — asset selection, rate comparison, wallet connection, transaction signing, and status tracking — backed by this API.

> 📖 **The canonical, always-current reference is the package README:**
> [`packages/swap-widget/README.md`](https://github.com/shapeshift/web/blob/develop/packages/swap-widget/README.md).
> It documents every prop, the theming API, supported chains/swappers, and exported hooks. This page is a short orientation; defer to the README for details.

## Installation

```bash
npm install @shapeshiftoss/swap-widget
```

Install the peer dependencies alongside it (React, wagmi/viem, React Query, and Reown AppKit):

```bash
npm install react react-dom wagmi @wagmi/core viem \
  @tanstack/react-query @reown/appkit @reown/appkit-adapter-wagmi
```

Import the stylesheet once (required for the widget to render correctly):

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
      walletConnectProjectId="your-walletconnect-project-id"
      partnerCode="your-partner-code"
      theme="dark"
      onSwapSuccess={txHash => console.log('Success:', txHash)}
    />
  )
}
```

## Key things to know

- **Wallet connection is built in.** The widget connects wallets via Reown AppKit (EVM, Bitcoin, and Solana).
- **AppKit must be initialized for the widget to render.** Either pass `walletConnectProjectId` and the widget initializes AppKit for you (get a free project ID at [dashboard.reown.com](https://dashboard.reown.com)), or initialize AppKit yourself in the host app and the widget reads the shared instance — pair that with `showConnectButton={false}` to drive connection from your own UI. See the [README](https://github.com/shapeshift/web/blob/develop/packages/swap-widget/README.md#wallet-connection).
- **`partnerCode` drives affiliate attribution.** It is forwarded to this API as the `X-Partner-Code` header. See the [Affiliate Program guide](https://github.com/shapeshift/web/blob/develop/docs/affiliates.md).
- **Chain/asset filtering** uses the `sellFilters` and `buyFilters` props (objects with `allowedChainIds` / `disabledChainIds` / `allowedAssetIds` / `disabledAssetIds`). See the README for the full prop list and examples.

For the complete props reference, theming options, supported chains and swappers, and exported utilities/hooks, see the [package README](https://github.com/shapeshift/web/blob/develop/packages/swap-widget/README.md).
