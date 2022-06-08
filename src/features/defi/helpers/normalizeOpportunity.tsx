import { AssetId, ChainId, fromAssetId } from '@shapeshiftoss/caip'
import { USDC_PRECISION } from 'constants/UsdcPrecision'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { MergedActiveStakingOpportunity } from 'pages/Defi/hooks/useCosmosStakingBalances'
import { MergedFoxyOpportunity } from 'pages/Defi/hooks/useFoxyBalances'
import { useVaultBalances } from 'pages/Defi/hooks/useVaultBalances'
import { selectAssetIds } from 'state/slices/selectors'

import { DefiProvider, DefiType } from '../contexts/DefiManagerProvider/DefiCommon'
import { SerializableOpportunity } from '../providers/yearn/components/YearnManager/Deposit/DepositCommon'
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
}

const useTransformVault = (vaults: SerializableOpportunity[]): EarnOpportunityType[] => {
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
      provider: DefiProvider.Yearn,
      version: vault.version,
      contractAddress: vault.id,
      rewardAddress: vault.id,
      tvl: bnOrZero(vault.tvl.balanceUsdc).div(`1e+${USDC_PRECISION}`).toString(),
      apy: vault.apy.toString(),
      expired: vault.expired,
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
        vault.expired ||
        bnOrZero(vault?.apy).isEqualTo(0) ||
        bnOrZero(vault.tvl.balanceUsdc).isEqualTo(0) ||
        (bnOrZero(vault?.apy).gt(200) && vault.isNew)
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

const transformFoxy = (foxies: MergedFoxyOpportunity[]): EarnOpportunityType[] => {
  return foxies.map(foxy => {
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
}

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
  vaultArray: SerializableOpportunity[]
  foxyArray: MergedFoxyOpportunity[]
  cosmosStakingOpportunities: MergedActiveStakingOpportunity[]
}

export const useNormalizeOpportunities = ({
  vaultArray,
  foxyArray,
  cosmosStakingOpportunities = [],
}: NormalizeOpportunitiesProps): EarnOpportunityType[] => {
  return [
    ...transformFoxy(foxyArray),
    ...useTransformCosmosStaking(cosmosStakingOpportunities),
    ...useTransformVault(vaultArray),
  ]
}
