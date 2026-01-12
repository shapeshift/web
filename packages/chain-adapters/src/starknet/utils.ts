import type { KnownChainIds } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'

import type { FeeDataEstimate } from '../types'

// STRK token contract address on Starknet mainnet (native gas token)
export const STRK_TOKEN_ADDRESS =
  '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

// OpenZeppelin account contract class hash - same as used in hdwallet
export const OPENZEPPELIN_ACCOUNT_CLASS_HASH =
  '0x05b4b537eaa2399e3aa99c4e2e0208ebd6c71bc1467938cd52c798c601e43564'

// Static fee estimates for undeployed accounts
// Used as fallback when RPC estimation fails
// These match typical Starknet transaction costs (account deployment costs ~0.001-0.01 STRK)
export const STATIC_FEE_ESTIMATES = {
  l1GasConsumed: '0x186a0', // 100,000
  l1GasPrice: '0x5f5e100', // 100 gwei
  l2GasConsumed: '0x0',
  l2GasPrice: '0x0',
  l1DataGasConsumed: '0x186a0', // 100,000
  l1DataGasPrice: '0x1', // 1 wei
}

export type FeeEstimateParams = {
  l1GasConsumed: string
  l1GasPrice: string
  l2GasConsumed: string
  l2GasPrice: string
  l1DataGasConsumed: string
  l1DataGasPrice: string
}

export const calculateFeeTiers = (
  params: FeeEstimateParams,
): FeeDataEstimate<KnownChainIds.StarknetMainnet> => {
  const {
    l1GasConsumed,
    l1GasPrice,
    l2GasConsumed,
    l2GasPrice,
    l1DataGasConsumed,
    l1DataGasPrice,
  } = params

  const baseFee = bnOrZero(l1GasConsumed)
    .times(l1GasPrice)
    .plus(bnOrZero(l2GasConsumed).times(l2GasPrice))
    .plus(bnOrZero(l1DataGasConsumed).times(l1DataGasPrice))

  const slowMaxFee = bnOrZero(l1GasConsumed)
    .times(1.5)
    .times(bnOrZero(l1GasPrice).times(1.2))
    .plus(bnOrZero(l2GasConsumed).times(1.5).times(bnOrZero(l2GasPrice).times(1.2)))
    .plus(bnOrZero(l1DataGasConsumed).times(1.5).times(bnOrZero(l1DataGasPrice).times(1.2)))
    .toFixed(0)

  const averageMaxFee = bnOrZero(l1GasConsumed)
    .times(3)
    .times(bnOrZero(l1GasPrice).times(1.5))
    .plus(bnOrZero(l2GasConsumed).times(3).times(bnOrZero(l2GasPrice).times(1.5)))
    .plus(bnOrZero(l1DataGasConsumed).times(3).times(bnOrZero(l1DataGasPrice).times(1.5)))
    .toFixed(0)

  const fastMaxFee = bnOrZero(l1GasConsumed)
    .times(5)
    .times(bnOrZero(l1GasPrice).times(2))
    .plus(bnOrZero(l2GasConsumed).times(5).times(bnOrZero(l2GasPrice).times(2)))
    .plus(bnOrZero(l1DataGasConsumed).times(5).times(bnOrZero(l1DataGasPrice).times(2)))
    .toFixed(0)

  return {
    slow: {
      txFee: baseFee.times(1.8).toFixed(0),
      chainSpecific: { maxFee: slowMaxFee },
    },
    average: {
      txFee: baseFee.times(4.5).toFixed(0),
      chainSpecific: { maxFee: averageMaxFee },
    },
    fast: {
      txFee: baseFee.times(10).toFixed(0),
      chainSpecific: { maxFee: fastMaxFee },
    },
  }
}
