# QR Code Swap Widget

A wallet-less swap widget that allows users to generate quotes and execute swaps via QR code payments.

## Overview

The QR Code Swap Widget is a variant of the standard Swap Widget that doesn't require wallet connection. Instead, users can:

1. Select assets to swap
2. Enter the amount to sell
3. Enter their receive address for the destination asset
4. Generate a quote from the ShapeShift microservices
5. Receive a QR code containing payment details
6. Scan and pay to execute the swap

## Features

- No wallet connection required
- Full quote generation using ShapeShift microservices
- QR code generation for easy mobile payments
- Quote details display (amount, rate, provider)
- Supports all EVM chains
- Fully themeable and customizable

## Usage

### Basic Implementation

```tsx
import { QrSwapWidget } from '@shapeshiftoss/swap-widget'

function App() {
  return (
    <QrSwapWidget
      apiKey="your-api-key"
      apiBaseUrl="http://localhost:3000" // Optional: defaults to https://api.shapeshift.com
      theme="dark"
      showPoweredBy={true}
    />
  )
}
```

### With Custom Theme

```tsx
import { QrSwapWidget } from '@shapeshiftoss/swap-widget'

const themeConfig = {
  mode: 'dark',
  accentColor: '#3861fb',
  backgroundColor: '#0a0a14',
  cardColor: '#12121c',
}

function App() {
  return (
    <QrSwapWidget
      apiKey="your-api-key"
      theme={themeConfig}
      showPoweredBy={true}
    />
  )
}
```

### With Event Callbacks

```tsx
import { QrSwapWidget } from '@shapeshiftoss/swap-widget'

function App() {
  const handleAssetSelect = (type: 'sell' | 'buy', asset: Asset) => {
    console.log(`${type} asset selected:`, asset)
  }

  return (
    <QrSwapWidget
      apiKey="your-api-key"
      onAssetSelect={handleAssetSelect}
      showPoweredBy={true}
    />
  )
}
```

## Props

All props from the standard `SwapWidget` are supported, except for wallet-related props like `walletClient`, `onConnectWallet`, `onSwapSuccess`, and `onSwapError`.

### Common Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiKey` | `string` | - | API key for ShapeShift services |
| `apiBaseUrl` | `string` | `https://api.shapeshift.com` | Base URL for the API (use `http://localhost:3000` for local microservices) |
| `theme` | `ThemeMode \| ThemeConfig` | `'dark'` | Widget theme |
| `defaultSellAsset` | `Asset` | ETH | Default asset to sell |
| `defaultBuyAsset` | `Asset` | USDC | Default asset to buy |
| `defaultSlippage` | `string` | `'0.5'` | Default slippage tolerance percentage |
| `showPoweredBy` | `boolean` | `true` | Show "Powered by ShapeShift" footer |
| `disabledChainIds` | `ChainId[]` | `[]` | Chains to disable |
| `disabledAssetIds` | `AssetId[]` | `[]` | Assets to disable |
| `allowedChainIds` | `ChainId[]` | - | If set, only these chains are allowed |
| `onAssetSelect` | `(type, asset) => void` | - | Called when user selects an asset |

## Development

### Running the Demo

To run the widget demos locally:

```bash
cd packages/swap-widget
yarn dev
```

Then open your browser to:
- Standard widget with wallet connection: http://localhost:3001/
- QR widget (wallet-less): http://localhost:3001/qr

Use the navigation menu at the top to switch between widget types.

### Connecting to Local Microservices

If you're running the ShapeShift microservices locally (e.g., the send-swap service), configure the widget to use your local API:

```tsx
<QrSwapWidget
  apiKey="test-api-key"
  apiBaseUrl="http://localhost:3000"
  showPoweredBy={true}
/>
```

## How It Works

1. **Quote Generation**: The widget calls the `/v1/swap/rates` endpoint to get available swap rates from various providers (THORChain, MAYAChain, CoW Swap, 0x, etc.)

2. **QR Code Display**: Once the user enters a receive address and amount, the widget generates a QR code containing:
   - Payment address (deposit address from the quote)
   - Amount to send
   - Asset information

3. **Payment Execution**: The user scans the QR code with their mobile wallet and sends the payment to execute the swap

## Important Notes

### Demo vs Production

The current implementation displays a demo QR code. In a production environment, you would need to:

1. Integrate with the actual ShapeShift send-swap microservice
2. Retrieve the real deposit address from the quote
3. Monitor the deposit address for incoming transactions
4. Track swap execution status

### Security Considerations

- Always validate user input (addresses, amounts)
- Use HTTPS for all API calls in production
- Implement proper error handling
- Display clear warnings about transaction risks
- Verify addresses are valid for the selected chain

## Future Enhancements

- Real-time transaction monitoring
- Swap status tracking
- Multiple QR code formats (Bitcoin URI, EIP-681, etc.)
- Email/SMS notifications for swap completion
- Support for non-EVM chains via deep links

## Support

For issues or questions, please open an issue in the main repository.
