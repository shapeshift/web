## ShapeShift Swapper

## Getting Started

```sh
yarn add @shapeshiftoss/swapper
```

## Usage

### Swapper CLI
- Copy the `sample.env` to `.env`
```
cp sample.env .env
```

- Useage:
```
$ swapcli [sellSymbol] [buySymbol] [sellAmount](denominated in sell asset, not wei)
```
ie:
```
$ swapcli ETH USDC 0.001
```

### Setup

```ts
import { SwapperManager, SwapperType, ZrxSwapper } from '@shapeshiftoss/swapper'

// in code
const manager = new SwapperManager<MyCustomSwapperTypes>()

// Add a swapper to the manager, you can add your own if they follow the `Swapper` api spec
manager
  .addSwapper(SwapperType.Zrx, new ZrxSwapper())
  .addSwapper(SwapperType.Thorchain, new ThorchainSwapper())

// Get a swapper from the manager
const swapper = manager.getSwapper(SwapperType.Zrx)

// Remove a swapper from the manager
manager.removeSwapper(SwapperType.Zrx)
```

### Working with the manager

```ts
// Get best quote and swapper for a trading pair
const { swapperType, quote } = await manager.getBestQuote(...args)

// Get the swapper and do stuff
const swapper = manager.getSwapper(swapperType)
```

### Working with a specific swapper

```ts
// Get a list of supported assets/trading pairs
const assets = await swapper.getSupportedAssets()

// Get a quote from a swapper
const quote = await swapper.getQuote(...args)

// Execute a Trade
const txToSign = await swapper.buildTransaction(...args)

// broadcast your TX
const tx = await swapper.execute(signedTx)
// or
const tx = await adapter.broadcastTransaction(...args)
```
