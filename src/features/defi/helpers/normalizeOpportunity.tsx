import type { AssetId, ChainId } from '@keepkey/caip'
import { fromAssetId } from '@keepkey/caip'
import { USDC_PRECISION } from 'constants/UsdcPrecision'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { MergedActiveStakingOpportunity } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import type { MergedSerializableOpportunity } from 'pages/Defi/hooks/useVaultBalances'
import { useVaultBalances } from 'pages/Defi/hooks/useVaultBalances'
import type { MergedFoxyOpportunity } from 'state/apis/foxy/foxyApi'
import { selectAssetIds } from 'state/slices/selectors'

import { DefiType } from '../contexts/DefiManagerProvider/DefiCommon'
import { chainIdToLabel } from './utils'

export type EarnOpportunityType = {
  type?: string
  provider: string
  version?: string
  contractAddress: string
  rewardAddress: string
  apy?: number | string
  tvl: string
  assetId: AssetId
  fiatAmount: string
  cryptoAmount: string
  expired?: boolean
  chainId: ChainId
  moniker?: string
  showAssetSymbol?: boolean
  isLoaded: boolean
  icons?: string[]
  // overrides any name down the road
  opportunityName?: string
}

const useTransformVault = (vaults: MergedSerializableOpportunity[]): EarnOpportunityType[] => {
  const assetIds = useSelector(selectAssetIds)

  const { vaults: vaultsWithBalances } = useVaultBalances()
  return vaults.reduce<EarnOpportunityType[]>((acc, vault) => {
    const chainId = fromAssetId(vault.feeAsset.assetId).chainId
    let fiatAmount = '0'
    let cryptoAmount = '0'
    if (vaultsWithBalances[vault.id]) {
      const balances = vaultsWithBalances[vault.id]
      cryptoAmount = balances.cryptoAmount
      fiatAmount = balances.fiatAmount
    }
    const assetId = vault.underlyingAsset.assetId
    const data = {
      type: DefiType.Vault,
      provider: vault.provider,
      version: vault.version,
      contractAddress: vault.id,
      rewardAddress: vault.id,
      tvl: bnOrZero(vault.tvl.balanceUsdc).div(`1e+${USDC_PRECISION}`).toString(),
      apy: vault.apy.toString(),
      expired: vault?.expired || false,
      chainId,
      assetId,
      fiatAmount,
      cryptoAmount,
      // DeFi foxy and yearn vaults are already loaded by the time they are transformed
      isLoaded: true,
    }
    // show vaults that are expired but have a balance
    // show vaults that don't have an APY but have a balance
    // don't show vaults that don't have a balance and don't have an APY
    // don't show new vaults that have an APY over 20,000% APY
    if (assetIds.includes(assetId)) {
      if (
        vault?.expired ||
        bnOrZero(vault?.apy).isEqualTo(0) ||
        bnOrZero(vault.tvl.balanceUsdc).isEqualTo(0) ||
        (bnOrZero(vault?.apy).gt(200) && (vault?.isNew || false))
      ) {
        if (bnOrZero(cryptoAmount).gt(0)) {
          acc.push(data)
        }
      } else {
        acc.push(data)
      }
    }
    return acc
  }, [])
}

const transformFoxy = (foxies: MergedFoxyOpportunity[]): EarnOpportunityType[] =>
  foxies.map(foxy => {
    const {
      provider,
      contractAddress,
      stakingToken: tokenAddress,
      rewardToken: rewardAddress,
      tvl,
      apy,
      expired,
      chainId,
      tokenAssetId: assetId,
      fiatAmount,
      cryptoAmount,
    } = foxy
    return {
      type: DefiType.TokenStaking,
      provider,
      contractAddress,
      tokenAddress,
      rewardAddress,
      tvl: bnOrZero(tvl).toString(),
      apy,
      expired,
      chainId,
      assetId,
      fiatAmount,
      cryptoAmount,
      // DeFi foxy and yearn vaults are already loaded by the time they are transformed
      isLoaded: true,
    }
  })

const useTransformCosmosStaking = (
  cosmosStakingOpportunities: MergedActiveStakingOpportunity[],
): EarnOpportunityType[] => {
  const translate = useTranslate()
  return cosmosStakingOpportunities
    .map(staking => {
      return {
        type: DefiType.TokenStaking,
        provider: chainIdToLabel(staking.chainId),
        contractAddress: staking.address,
        rewardAddress: '',
        tvl: staking.tvl,
        apy: staking.apr,
        chainId: staking.chainId,
        assetId: staking.assetId,
        fiatAmount: staking.fiatAmount ?? '',
        cryptoAmount: staking.cryptoAmount ?? '',
        moniker: staking.moniker,
        version:
          !bnOrZero(staking.cryptoAmount).isZero() &&
          translate('defi.validatorMoniker', { moniker: staking.moniker }),
        showAssetSymbol: bnOrZero(staking.cryptoAmount).isZero(),
        isLoaded: Boolean(staking.isLoaded),
      }
    })
    .sort((opportunityA, opportunityB) => {
      return bnOrZero(opportunityA.cryptoAmount).gt(bnOrZero(opportunityB.cryptoAmount)) ? -1 : 1
    })
}

type NormalizeOpportunitiesProps = {
  vaultArray: MergedSerializableOpportunity[]
  foxyArray: MergedFoxyOpportunity[]
  cosmosSdkStakingOpportunities: MergedActiveStakingOpportunity[]
  foxEthLpOpportunity?: EarnOpportunityType
  foxFarmingOpportunities?: EarnOpportunityType[]
}

export const useNormalizeOpportunities = ({
  vaultArray,
  foxyArray,
  cosmosSdkStakingOpportunities = [],
  foxEthLpOpportunity,
  foxFarmingOpportunities,
}: NormalizeOpportunitiesProps): EarnOpportunityType[] => {
  return [
    ...transformFoxy(foxyArray),
    ...useTransformCosmosStaking(cosmosSdkStakingOpportunities),
    ...(foxFarmingOpportunities ? foxFarmingOpportunities : []),
    ...(foxEthLpOpportunity ? [foxEthLpOpportunity] : []),
    ...useTransformVault(vaultArray),
  ]
}
