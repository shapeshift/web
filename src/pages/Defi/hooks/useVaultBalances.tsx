import { AssetId, ChainId, fromAssetId } from '@shapeshiftoss/caip'
import { Account } from '@shapeshiftoss/chain-adapters'
import { YearnInvestor } from '@shapeshiftoss/investor-yearn'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { SerializableOpportunity } from 'features/defi/providers/yearn/components/YearnManager/Deposit/DepositCommon'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useWallet } from 'hooks/useWallet/useWallet'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { PortfolioBalancesById } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectAssets,
  selectMarketData,
  selectPortfolioAssetBalances,
  selectPortfolioLoading,
} from 'state/slices/selectors'

export type EarnVault = Partial<Account<ChainId>> &
  SerializableOpportunity & {
    vaultAssetId: AssetId
    tokenAssetId: AssetId
    pricePerShare: BigNumber
  }

async function getYearnVaults(balances: PortfolioBalancesById, yearn: YearnInvestor | null) {
  const acc: Record<string, EarnVault> = {}
  if (!yearn) return acc
  const opportunities = await yearn.findAll()
  for (let index = 0; index < opportunities.length; index++) {
    const vault = opportunities[index]
    const vaultAssetId = vault.positionAsset.assetId
    const tokenAssetId = vault.underlyingAsset.assetId
    const balance = balances[vaultAssetId]

    if (balance) {
      acc[vault.id] = {
        ...vault,
        chainId: fromAssetId(vault.positionAsset.assetId).chainId,
        balance,
        vaultAssetId,
        tokenAssetId,
        pricePerShare: vault?.positionAsset.underlyingPerPosition,
      }
    }
  }
  return acc
}

export type MergedEarnVault = EarnVault & {
  cryptoAmount: string
  fiatAmount: string
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
          apy: vault.apy,
          underlyingTokenBalanceUsdc: bnOrZero(vault.tvl.balanceUsdc)
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
