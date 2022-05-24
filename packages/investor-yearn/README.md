# @shapeshiftoss/investor-yearn

ShapeShift's Yearn investor package.

## Installation

```bash
yarn add @shapeshiftoss/investor-yearn
```

## Initialization

```javascript
import { YearnVaultApi } from '@shapeshiftoss/investor-yearn'

  const api = new YearnVaultApi({
    adapter: adapters.byChain(ChainTypes.Ethereum), // adapter is an ETH @shapeshiftoss/chain-adapters
    providerUrl: '<your eth node privider url>'
  })
  await api.initialize()
```

### Functions

* initialize
* findAll
* findByDepositVaultAddress
* findByVaultTokenId
* getGasPrice
* getTxReceipt
* checksumAddress
* getVaultId
* estimateApproveGas
* approve
* allowance
* estimateDepositGas
* deposit
* estimateWithdrawGas
* withdraw
* balance
* token
* totalSupply
* pricePerShare
* apy

### Examples
```javascript

await api.initialize()

// (object)
await api.deposit({
  amountDesired: new BigNumber(10).times(`1e+18`), // 10 underlying tokens
  tokenContractAddress: '0xdef1cafe',
  vaultAddress: '0xdef1c4fe',
  userAddress: '0xdef1caf3',
  dryRun: false,
  wallet: HDWallet
})

// returns a string of the txid
//   '0x2d1e60192fe3f671ecb46d9165fdf2a03bd4a4fb8764dacc2a07c5df6307ac59'

// (object)
await api.deposit({
  amountDesired: new BigNumber(10).times(`1e+18`), // 10 underlying tokens
  tokenContractAddress: '0xdef1cafe',
  vaultAddress: '0xdef1c4fe',
  userAddress: '0xdef1caf3',
  dryRun: true,
  wallet: HDWallet
})
// When dryrun is true, it returns a string signed transaction
// '0xf86c0a85046c7cfe0083016dea94d1310c1e038bc12865d3d3997275b3e4737c6302880b503be34d9fe80080269fc7eaaa9c21f59adf8ad43ed66cf5ef9ee1c317bd4d32cd65401e7aaca47cfaa0387d79c65b90be6260d09dcfb780f29dd8133b9b1ceb20b83b7e442b4bfc30cb'

// (object)
await api.estimateDepositGas({
  amountDesired: new BigNumber(10).times(`1e+18`), // 10 underlying tokens
  tokenContractAddress: '0xdef1cafe',
  vaultAddress: '0xdef1c4fe',
  userAddress: '0xdef1caf3',
})
// returns a BigNumber of the gas estimate

// (object)
await api.apy({
  vaultAddress: '0xdef1cafe'
})
// returns a string of the net_apy for that vault
// '32.59'
```
