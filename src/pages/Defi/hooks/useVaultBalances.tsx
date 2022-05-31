import { AssetId, toAssetId } from '@shapeshiftoss/caip'
import {
  getSupportedVaults,
  SupportedYearnVault,
  YearnInvestor,
  YearnOpportunity,
} from '@shapeshiftoss/investor-yearn'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import find from 'lodash/find'
import toLower from 'lodash/toLower'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useWallet } from 'hooks/useWallet/useWallet'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { chainTypeToMainnetChainId } from 'lib/utils'
import { PortfolioBalancesById } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectAssets,
  selectMarketData,
  selectPortfolioAssetBalances,
  selectPortfolioLoading,
} from 'state/slices/selectors'

export type EarnVault = Partial<chainAdapters.Account<ChainTypes>> &
  SupportedYearnVault & { vaultAssetId: AssetId; tokenAssetId: AssetId; pricePerShare: BigNumber }

async function getYearnVaults(balances: PortfolioBalancesById, yearn: YearnInvestor | null) {
  const acc: Record<string, EarnVault> = {}
  const vaults = await getSupportedVaults()
  if (!yearn) return
  const opportunities = await yearn.findAll()
  for (let index = 0; index < vaults.length; index++) {
    // TODO: assetIds in vaults
    const vault = vaults[index]
    const vaultAssetId = toAssetId({
      chainId: chainTypeToMainnetChainId(vault.chain),
      assetNamespace: 'erc20',
      assetReference: vault.vaultAddress,
    })
    const tokenAssetId = toAssetId({
      chainId: chainTypeToMainnetChainId(vault.chain),
      assetNamespace: 'erc20',
      assetReference: vault.tokenAddress,
    })
    const balance = balances[vaultAssetId]

    if (balance) {
      const opportunity = find<YearnOpportunity>(
        opportunities,
        (opp: YearnOpportunity) => toLower(opp.id) === toLower(vault.vaultAddress),
      )
      if (!opportunity) continue
      const pricePerShare = opportunity?.positionAsset.price
      acc[vault.vaultAddress] = {
        ...vault,
        balance,
        vaultAssetId,
        tokenAssetId,
        pricePerShare: bnOrZero(pricePerShare),
      }
    }
  }
  return acc
}

export type MergedEarnVault = EarnVault & {
  cryptoAmount: string
  fiatAmount: string
  apy?: number
  underlyingTokenBalanceUsdc?: string
}

export type UseVaultBalancesReturn = {
  vaults: Record<string, MergedEarnVault>
  totalBalance: string
  loading: boolean
}

export function useVaultBalances(): UseVaultBalancesReturn {
  const USDC_PRECISION = 6
  const {
    state: { wallet },
  } = useWallet()
  const [loading, setLoading] = useState(false)
  const [vaults, setVaults] = useState<Record<string, EarnVault>>({})
  const marketData = useSelector(selectMarketData)
  const assets = useSelector(selectAssets)
  const dispatch = useDispatch()

  const { yearn, loading: yearnLoading } = useYearn()
  const balances = useSelector(selectPortfolioAssetBalances)
  const balancesLoading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    if (!wallet || yearnLoading) return
    ;(async () => {
      setLoading(true)
      try {
        const yearnVaults = await getYearnVaults(balances, yearn)
        if (!yearnVaults) return
        setVaults(yearnVaults)
      } catch (error) {
        console.error('error', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [balances, dispatch, wallet, balancesLoading, yearnLoading, yearn])

  const makeVaultFiatAmount = useCallback(
    (vault: EarnVault) => {
      const asset = assets[vault.vaultAssetId]
      const pricePerShare = bnOrZero(vault.pricePerShare).div(`1e+${asset?.precision}`)
      const marketPrice = marketData[vault.tokenAssetId]?.price
      return bnOrZero(vault.balance)
        .div(`1e+${asset?.precision}`)
        .times(pricePerShare)
        .times(bnOrZero(marketPrice))
    },
    [assets, marketData],
  )

  const totalBalance = useMemo(
    () =>
      Object.values(vaults).reduce((acc: BigNumber, vault: EarnVault) => {
        const amount = makeVaultFiatAmount(vault)
        return acc.plus(bnOrZero(amount))
      }, bn(0)),
    [makeVaultFiatAmount, vaults],
  )

  const mergedVaults = useMemo(() => {
    return Object.entries(vaults).reduce(
      (acc: Record<string, MergedEarnVault>, [vaultAddress, vault]) => {
        const asset = assets[vault.vaultAssetId]
        const fiatAmount = makeVaultFiatAmount(vault)
        acc[vaultAddress] = {
          ...vault,
          cryptoAmount: bnOrZero(vault.balance).div(`1e+${asset?.precision}`).toString(),
          fiatAmount: fiatAmount.toString(),
          apy: vault.metadata?.apy?.net_apy,
          underlyingTokenBalanceUsdc: bnOrZero(vault.underlyingTokenBalance.amountUsdc)
            .div(`1e+${USDC_PRECISION}`)
            .toString(),
        }
        return acc
      },
      {},
    )
  }, [assets, makeVaultFiatAmount, vaults])

  return {
    vaults: mergedVaults,
    totalBalance: totalBalance.toString(),
    loading: loading || yearnLoading || balancesLoading,
  }
}
