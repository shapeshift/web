# @shapeshiftoss/investor-foxy

ShapeShift's Yearn investor package.

## Installation

```bash
yarn add @shapeshiftoss/investor-foxy
```

## Initialization

```javascript
import { FoxyApi } from '@shapeshiftoss/investor-foxy'
import { toChainId } from '@shapeshiftoss/caip'

const api = new FoxyApi({
  adapter: await adapterManager.byChainId(
    toChainId({ chain: ChainTypes.Ethereum, network: NetworkTypes.MAINNET })
  ), // adapter is an ETH @shapeshiftoss/chain-adapters
  providerUrl: '<your eth node privider url>'
})
```

### Functions

- getFoxyOpportunities
- getFoxyOpportunityByStakingAddress
- getGasPrice
- getTxReceipt
- checksumAddress
- estimateClaimWithdrawGas
- estimateSendWithdrawalRequestsGas
- estimateAddLiquidityGas
- estimateRemoveLiquidityGas
- estimateWithdrawGas
- estimateInstantWithdrawGas
- estimateDepositGas
- estimateApproveGas
- approve
- allowance
- deposit
- withdraw
- instantWithdraw
- claimWithdraw
- sendWithdrawalRequests
- addLiquidity
- removeLiquidity
- getTimeUntilClaimable
- balance
- totalSupply
- pricePerShare
- apy
- tvl

### Examples

For more in-depth examples, check out ./src/foxycli.ts

```javascript
const api = new FoxyApi({
  adapter: await adapterManager.byChainId(
    toChainId({ chain: ChainTypes.Ethereum, network: NetworkTypes.MAINNET })
  ),
  providerUrl: 'https://dev-api.ethereum.shapeshift.com'
})

await api.approve({
  tokenContractAddress, // FOX address
  contractAddress, // Staking contract address
  userAddress, // User's wallet address
  wallet // HDWallet
})

await api.deposit({
  contractAddress, // Staking contract address
  amountDesired, // Amount to stake
  userAddress, // User's wallet address
  wallet // HDWallet
})

await api.withdraw({
  contractAddress, // Staking contract address
  amountDesired, // Amount to unstake
  userAddress, // User's wallet address
  wallet // HDWallet
})
```
