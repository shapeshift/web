import { fromAssetId } from '@shapeshiftoss/caip'
import { YearnInvestor, YearnOpportunity } from '@shapeshiftoss/investor-yearn'
import { ChainTypes } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { toLower } from 'lodash'

import { bnOrZero } from './bignumber/bignumber'

export type SupportedYearnVault = {
  vaultAddress: string
  name: string
  symbol: string
  tokenAddress: string
  chain: ChainTypes
  provider: DefiProvider
  type: DefiType
  expired: boolean
  version: string
  tvl: {
    balance: BigNumber
    balanceUsdc: BigNumber
    assetId: string
  }
  apy: number
  isNew: boolean
}

export const transfromYearnOpportunities = async (
  yearnInvestor: YearnInvestor,
): Promise<SupportedYearnVault[]> => {
  const opportunities = await yearnInvestor.findAll()
  return opportunities.map(transformOpportunity)
}

const transformOpportunity = (opportunity: YearnOpportunity): SupportedYearnVault => {
  return {
    apy: opportunity.apy.toNumber(),
    chain: ChainTypes.Ethereum,
    expired:
      opportunity.metadata.depositsDisabled || bnOrZero(opportunity.metadata.depositLimit).lte(0),
    isNew: opportunity.isNew,
    name: opportunity.name,
    provider: DefiProvider.Yearn,
    symbol: opportunity.symbol,
    tokenAddress: fromAssetId(opportunity.underlyingAsset.assetId).assetReference,
    tvl: opportunity.tvl,
    type: DefiType.Vault,
    version: opportunity.version,
    vaultAddress: toLower(opportunity.id),
  }
}
