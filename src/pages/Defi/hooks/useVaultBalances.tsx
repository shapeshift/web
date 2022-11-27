import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import type { YearnInvestor } from '@shapeshiftoss/investor-yearn'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import type { SerializableOpportunity as YearnSerializableOpportunity } from 'features/defi/providers/yearn/components/YearnManager/Deposit/DepositCommon'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import type { AssetBalancesById } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectAssets,
  selectMarketData,
  selectPortfolioAssetBalances,
  selectPortfolioLoading,
} from 'state/slices/selectors'
const moduleLogger = logger.child({ namespace: ['useVaultBalances'] })

export type MergedSerializableOpportunity = YearnSerializableOpportunity & {
  provider: string
}

export type YearnEarnVault = Partial<Account<ChainId>> &
  YearnSerializableOpportunity & {
    provider: string
    vaultAssetId: AssetId
    tokenAssetId: AssetId
    pricePerShare: BigNumber
  }

async function getYearnVaults(balances: AssetBalancesById, yearn: YearnInvestor | null) {
  const acc: Record<string, YearnEarnVault> = {}
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
        balance,
        vaultAssetId,
        tokenAssetId,
        provider: DefiProvider.Yearn,
        chainId: fromAssetId(vault.positionAsset.assetId).chainId,
        pricePerShare: vault?.positionAsset.underlyingPerPosition,
      }
    }
  }
  return acc
}

export type EarnVault = YearnEarnVault

export type MergedEarnVault = EarnVault & {
  cryptoAmountBaseUnit: string
  /** @deprecated use cryptoAmountBaseUnit instead and derive precision amount from it*/
  cryptoAmountPrecision: string
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
        const allVaults = yearnVaults

        setVaults(allVaults)
      } catch (error) {
        moduleLogger.error(error, 'error')
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
          cryptoAmountBaseUnit: vault.balance ?? '0',
          cryptoAmountPrecision: bnOrZero(vault.balance).div(`1e+${asset?.precision}`).toString(),
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
