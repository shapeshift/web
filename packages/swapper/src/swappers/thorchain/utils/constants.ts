import { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'

import { bn } from '../../utils/bignumber'

export const MAX_THORCHAIN_TRADE = '100000000000000000000000000'
export const MAX_ALLOWANCE = '100000000000000000000000000'
export const THOR_MINIMUM_PADDING = 1.2
export const THOR_ETH_GAS_LIMIT = '100000' // for sends of eth / erc20 into thorchain router
export const THORCHAIN_FIXED_PRECISION = 8 // limit values are precision 8 regardless of the chain
export const THORCHAIN_AFFILIATE_NAME = 'ss'
export const THORCHAIN_AFFILIATE_BIPS = '0' // affiliate fee in basis points (100 = 1%)

// Used to estimate the fee thorchain will take out of the buyAsset
// Official docs on fees are incorrect
// https://discord.com/channels/838986635756044328/997675038675316776/998552541170253834
// This is still not "perfect" and tends to overestimate by a small randomish amount
// TODO figure out if its possible to accurately estimate the outbound fee.
// Neither the discord nor official docs are correct
export const THOR_TRADE_FEE_MULTIPLIERS: Record<ChainId, BigNumber> = {
  [KnownChainIds.BitcoinMainnet]: bn(0.00002), // 1000 estimated bytes * 2 (as recommended on discord)
  [KnownChainIds.DogecoinMainnet]: bn(0.00002), // 1000 estimated bytes * 2 (as recommended on discord)
  [KnownChainIds.LitecoinMainnet]: bn(0.000005), // 250 estimated bytes * 2 (as recommended on discord)
  [KnownChainIds.BitcoinCashMainnet]: bn(0.00003), // 1500 estimated bytes * 2 (as recommended on discord)
  [KnownChainIds.CosmosMainnet]: bn(0.00000002), // 1 gas * 2 (as recommended on discord)
  [KnownChainIds.EthereumMainnet]: bn(0.00024), // A value that "works". Discord recommended value (80,000 gas * 2 or 160k) is often too low
}
