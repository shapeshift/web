# SendSwapStatus Component

This component provides real-time status tracking for send-swap operations.

## Features

- ✅ Automatic polling for status updates (every 3 seconds)
- ✅ Visual progress stepper showing all executed steps
- ✅ Real-time status updates from backend
- ✅ Displays deposit and execution transaction hashes
- ✅ Shows timestamps for each step
- ✅ Handles completion, failure, and expiration states
- ✅ Auto-stops polling when swap is complete/failed

## Usage

```tsx
import { SendSwapStatus } from '@/components/SendSwapStatus'

function MyComponent() {
  const quoteId = 'quote_abc123' // From send-swap-service API

  return <SendSwapStatus quoteId={quoteId} />
}
```

## Props

| Prop      | Type      | Required | Default | Description                          |
| --------- | --------- | -------- | ------- | ------------------------------------ |
| `quoteId` | `string`  | Yes      | -       | The quote ID from send-swap-service  |
| `enabled` | `boolean` | No       | `true`  | Whether to enable status polling     |

## Environment Variables

Set the send-swap API URL in your `.env` file:

```bash
REACT_APP_SEND_SWAP_API_URL=http://localhost:3004
```

If not set, defaults to `http://localhost:3004`.

## Backend API

This component expects the following endpoint to be available:

```
GET /quotes/:quoteId/status
```

Response format:
```json
{
  "quoteId": "quote_abc123",
  "status": "EXECUTING",
  "currentStep": "Executing step 2/3...",
  "statusHistory": [
    {
      "step": "Relay quote received: 3 steps to execute",
      "status": null,
      "timestamp": "2026-01-18T20:10:00.000Z"
    },
    {
      "step": "Checking token approval...",
      "status": null,
      "timestamp": "2026-01-18T20:10:01.000Z"
    }
  ],
  "depositTxHash": "0x123...",
  "executionTxHash": null,
  "executedAt": null,
  "createdAt": "2026-01-18T20:09:00.000Z",
  "updatedAt": "2026-01-18T20:10:05.000Z",
  "expiresAt": "2026-01-18T20:39:00.000Z",
  "isExpired": false
}
```

## Status Values

- `ACTIVE`: Quote is active, waiting for deposit
- `DEPOSIT_RECEIVED`: Deposit detected, swap will execute soon
- `EXECUTING`: Swap is being executed
- `COMPLETED`: Swap completed successfully
- `FAILED`: Swap failed
- `EXPIRED`: Quote expired before completion

## Integration Example

To integrate into the trade flow:

```tsx
import { useState } from 'react'
import { SendSwapStatus } from '@/components/SendSwapStatus'

function TradeConfirmation() {
  const [sendSwapQuoteId, setSendSwapQuoteId] = useState<string>()

  // After creating a send-swap quote from backend
  const handleCreateSendSwap = async () => {
    const response = await fetch('http://localhost:3004/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellAssetId: 'eip155:42161/erc20:0xaf88...',
        buyAssetId: 'eip155:42161/slip44:60',
        sellAmountCryptoBaseUnit: '100000',
        receiveAddress: '0x742...',
        // ... other fields
      }),
    })
    const data = await response.json()
    setSendSwapQuoteId(data.quoteId)
  }

  return (
    <div>
      <button onClick={handleCreateSendSwap}>Create Send Swap</button>
      {sendSwapQuoteId && <SendSwapStatus quoteId={sendSwapQuoteId} />}
    </div>
  )
}
```
