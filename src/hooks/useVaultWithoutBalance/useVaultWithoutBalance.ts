import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { SerializableOpportunity } from 'features/defi/providers/yearn/components/YearnManager/Deposit/DepositCommon'
import filter from 'lodash/filter'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { selectPortfolioAssetBalances, selectPortfolioLoading } from 'state/slices/selectors'
const moduleLogger = logger.child({ namespace: ['useVaultWithoutBalance'] })

export type YearnVaultWithUnderlyingTokenBalance = SerializableOpportunity & {
  underlyingTokenBalanceUsdc: string
}

export type UseVaultWithoutBalanceReturn = {
  vaultsWithoutBalance: Record<string, SerializableOpportunity>
  vaultsWithoutBalanceLoading: boolean
}

export function useVaultWithoutBalance(): UseVaultWithoutBalanceReturn {
  const USDC_PRECISION = 6
  const {
    state: { wallet },
  } = useWallet()
  const [loading, setLoading] = useState(false)
  const [vaults, setVaults] = useState<SerializableOpportunity[]>([])
  const dispatch = useDispatch()

  const { yearn, loading: yearnLoading } = useYearn()
  const balances = useSelector(selectPortfolioAssetBalances)
  const balancesLoading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    if (!(wallet && yearn) || yearnLoading) return
    ;(async () => {
      setLoading(true)
      try {
        const yearnVaults = await yearn.findAll()
        // Filter out all vaults with 0 USDC TVL value
        const vaultsWithTVL = filter(yearnVaults, vault => bnOrZero(vault.tvl.balanceUsdc).gt(0))
        setVaults(vaultsWithTVL)
      } catch (error) {
        moduleLogger.error(error, 'error getting supported yearn vaults')
      } finally {
        setLoading(false)
      }
    })()
  }, [balances, dispatch, wallet, balancesLoading, yearnLoading, yearn])

  const mergedVaults = useMemo(() => {
    return Object.entries(vaults).reduce(
      (acc: Record<string, YearnVaultWithUnderlyingTokenBalance>, [_, vault]) => {
        acc[vault.id] = {
          ...vault,
          underlyingTokenBalanceUsdc: bnOrZero(vault?.tvl.balanceUsdc)
            .div(`1e+${USDC_PRECISION}`)
            .toString(),
        }
        return acc
      },
      {},
    )
  }, [vaults])

  return {
    vaultsWithoutBalance: mergedVaults,
    vaultsWithoutBalanceLoading: loading || yearnLoading || balancesLoading,
  }
}
