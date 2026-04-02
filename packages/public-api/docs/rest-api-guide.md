Step-by-step guide for integrating swaps via the REST API.

## 1. Get Supported Chains
```
GET /v1/chains
```

## 2. Get Supported Assets
```
GET /v1/assets
```

## 3. Get Swap Rates
```
GET /v1/swap/rates?sellAssetId=eip155:1/slip44:60&buyAssetId=eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&sellAmountCryptoBaseUnit=1000000000000000000
X-Partner-Code: your-partner-code (optional)
```

## 4. Get Executable Quote
```
POST /v1/swap/quote
X-Partner-Code: your-partner-code (optional)

{
  "sellAssetId": "eip155:1/slip44:60",
  "buyAssetId": "bip122:000000000019d6689c085ae165831e93/slip44:0",
  "sellAmountCryptoBaseUnit": "1000000000000000000",
  "swapperName": "Relay",
  "receiveAddress": "bc1q...",
  "sendAddress": "0x..."
}
```

## 5. Execute the Swap
Use the returned `transactionData` to build and sign a transaction with the user's wallet, then broadcast it to the network.

## 6. Check Swap Status
```
GET /v1/swap/status?quoteId=<quoteId>&txHash=0x...
```

On the **first call**, include `txHash` to bind the transaction to the quote and start tracking. Subsequent polls can omit `txHash`.
