import filter from 'lodash/filter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useIdle } from 'features/defi/contexts/IdleProvider/IdleProvider'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { MergedSerializableOpportunity } from 'pages/Defi/hooks/useVaultBalances'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
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

  const { idle, loading: idleLoading } = useIdle()
  const { yearn, loading: yearnLoading } = useYearn()

  const balances = useSelector(selectPortfolioAssetBalances)
  const balancesLoading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    if (!(wallet && yearn && idle) || yearnLoading || idleLoading) return
    ;(async () => {
      setLoading(true)
      try {
        const [idleVaults, yearnVaults] = await Promise.all([idle.findAll(), yearn.findAll()])

        // Filter out all vaults with 0 USDC TVL value
        const yearnVaultsWithTVL = filter(yearnVaults, vault => bnOrZero(vault.tvl.balanceUsdc).gt(0))
        const idleVaultsWithTVL = filter(idleVaults, vault => bnOrZero(vault.tvl.balanceUsdc).gt(0))

        const vaults = [
          ...yearnVaultsWithTVL.map(v => ({
            ...v,
            provider: DefiProvider.Yearn,
          })),
          ...idleVaultsWithTVL.map(v => ({
            ...v,
            provider: DefiProvider.Idle,
          })),
        ]

        setVaults(vaults)
      } catch (error) {
        console.error('error getting supported yearn vaults', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [balances, dispatch, wallet, balancesLoading, yearnLoading, yearn, idleLoading, idle])

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
