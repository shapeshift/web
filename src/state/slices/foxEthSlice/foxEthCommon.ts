import { ethChainId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'

import {
  FOX_FARMING_V1_CONTRACT_ADDRESS,
  FOX_FARMING_V2_CONTRACT_ADDRESS,
  FOX_FARMING_V3_CONTRACT_ADDRESS,
  FOX_FARMING_V4_CONTRACT_ADDRESS,
  FOX_TOKEN_CONTRACT_ADDRESS,
  foxEthLpAssetId,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from './constants'

export type UserEarnOpportunityType = {
  stakedAmountCryptoPrecision?: string
  rewardsAmountCryptoPrecision?: string
  isVisible?: boolean
  // TODO: AccountId
  accountAddress?: string
} & EarnOpportunityType

const icons = [
  'https://assets.coincap.io/assets/icons/eth@2x.png',
  'https://assets.coincap.io/assets/icons/256/fox.png',
]

export const lpOpportunity: EarnOpportunityType = {
  provider: DefiProvider.FoxEthLP,
  contractAddress: UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
  rewardAddress: '',
  tvl: '',
  assetId: foxEthLpAssetId,
  fiatAmount: '',
  cryptoAmount: '',
  chainId: ethChainId,
  isLoaded: false,
  type: DefiType.LiquidityPool,
  icons,
}

export const baseFarmingOpportunity = {
  provider: DefiProvider.FoxFarming,
  rewardAddress: FOX_TOKEN_CONTRACT_ADDRESS,
  tvl: '',
  assetId: foxEthLpAssetId,
  fiatAmount: '',
  cryptoAmount: '',
  rewardsAmountCryptoPrecision: '',
  chainId: ethChainId,
  isLoaded: false,
  type: DefiType.Farming,
  icons,
}

const v4FarmingOpportunity: UserEarnOpportunityType = {
  ...baseFarmingOpportunity,
  contractAddress: FOX_FARMING_V4_CONTRACT_ADDRESS,
  opportunityName: 'Fox Farming V4',
}

const v3FarmingOpportunity: UserEarnOpportunityType = {
  ...baseFarmingOpportunity,
  contractAddress: FOX_FARMING_V3_CONTRACT_ADDRESS,
  opportunityName: 'Fox Farming V3',
}

const v2FarmingOpportunity: UserEarnOpportunityType = {
  ...baseFarmingOpportunity,
  contractAddress: FOX_FARMING_V2_CONTRACT_ADDRESS,
  opportunityName: 'Fox Farming V2',
}

const v1FarmingOpportunity: UserEarnOpportunityType = {
  ...baseFarmingOpportunity,
  contractAddress: FOX_FARMING_V1_CONTRACT_ADDRESS,
  opportunityName: 'Fox Farming V1',
}

export const farmingOpportunities = [
  v1FarmingOpportunity,
  v2FarmingOpportunity,
  v3FarmingOpportunity,
  v4FarmingOpportunity,
]
