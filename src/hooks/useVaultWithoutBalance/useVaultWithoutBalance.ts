import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useIdle } from 'features/defi/contexts/IdleProvider/IdleProvider'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { MergedSerializableOpportunity } from 'pages/Defi/hooks/useVaultBalances'
import { selectPortfolioAssetBalances, selectPortfolioLoading } from 'state/slices/selectors'

export type VaultWithUnderlyingTokenBalance = MergedSerializableOpportunity & {
  underlyingTokenBalanceUsdc: string
}

export type UseVaultWithoutBalanceReturn = {
  vaultsWithoutBalance: Record<string, MergedSerializableOpportunity>
  vaultsWithoutBalanceLoading: boolean
}

export function useVaultWithoutBalance(): UseVaultWithoutBalanceReturn {
  const USDC_PRECISION = 6
  const {
    state: { wallet },
  } = useWallet()
  const [loading, setLoading] = useState(false)
  const [vaults, setVaults] = useState<MergedSerializableOpportunity[]>([])
  const dispatch = useDispatch()

  const { yearn, loading: yearnLoading } = useYearn()
  const { idle, loading: idleLoading, enabled: idleEnabled } = useIdle()

  const balances = useSelector(selectPortfolioAssetBalances)
  const balancesLoading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    if (!(wallet && yearn && (idle || !idleEnabled)) || yearnLoading || idleLoading) return
    ;(async () => {
      setLoading(true)
      try {
        const providers = {
          [DefiProvider.Idle]: idle,
          [DefiProvider.Yearn]: yearn,
        }

        const allVaults: MergedSerializableOpportunity[] = []
        const providersVaults = await Promise.all(
          Object.values(providers).map(p => (p ? p.findAll() : null)),
        )

        providersVaults.forEach((providerVaults, index) => {
          if (!providerVaults) return
          const vaultsWithTvl: MergedSerializableOpportunity[] = Object.values(
            providerVaults,
          ).filter((vault: MergedSerializableOpportunity) => {
            return bnOrZero(vault.tvl.balanceUsdc).gt(0)
          })
          allVaults.push(
            ...vaultsWithTvl.map(vault => ({
              ...vault,
              provider: Object.keys(providers)[index],
            })),
          )
        })

        setVaults(allVaults)
      } catch (error) {
        console.error('error getting supported yearn vaults', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [
    balances,
    dispatch,
    wallet,
    balancesLoading,
    yearnLoading,
    yearn,
    idleLoading,
    idle,
    idleEnabled,
  ])

  const mergedVaults = useMemo(() => {
    return Object.entries(vaults).reduce(
      (acc: Record<string, VaultWithUnderlyingTokenBalance>, [_, vault]) => {
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
    vaultsWithoutBalanceLoading: loading || yearnLoading || balancesLoading || idleLoading,
  }
}
