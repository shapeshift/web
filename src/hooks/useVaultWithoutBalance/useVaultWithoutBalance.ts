import { getSupportedVaults, SupportedYearnVault } from '@shapeshiftoss/investor-yearn'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import filter from 'lodash/filter'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectPortfolioAssetBalances, selectPortfolioLoading } from 'state/slices/selectors'

export type YearnVaultWithApyAndTvl = SupportedYearnVault & {
  apy?: number
  underlyingTokenBalanceUsdc: string
}

export type UseVaultWithoutBalanceReturn = {
  vaultsWithoutBalance: Record<string, YearnVaultWithApyAndTvl>
  vaultsWithoutBalanceLoading: boolean
}

export function useVaultWithoutBalance(): UseVaultWithoutBalanceReturn {
  const USDC_PRECISION = 6
  const {
    state: { wallet },
  } = useWallet()
  const [loading, setLoading] = useState(false)
  const [vaults, setVaults] = useState<SupportedYearnVault[]>([])
  const dispatch = useDispatch()

  const { yearn, loading: yearnLoading } = useYearn()
  const balances = useSelector(selectPortfolioAssetBalances)
  const balancesLoading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    if (!wallet || yearnLoading) return
    ;(async () => {
      setLoading(true)
      try {
        const yearnVaults = await getSupportedVaults()
        // Filter out all vaults with 0 USDC TVL value
        const vaultsWithTVL = filter(yearnVaults, vault =>
          bnOrZero(vault.underlyingTokenBalance.amountUsdc).gt(0),
        )
        setVaults(vaultsWithTVL)
      } catch (error) {
        console.error('error getting supported yearn vaults', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [balances, dispatch, wallet, balancesLoading, yearnLoading, yearn])

  const mergedVaults = useMemo(() => {
    return Object.entries(vaults).reduce(
      (acc: Record<string, YearnVaultWithApyAndTvl>, [_, vault]) => {
        const yearnVault = yearn?.findByVaultTokenId(vault.vaultAddress)
        acc[vault.vaultAddress] = {
          ...vault,
          apy: yearnVault?.metadata?.apy?.net_apy,
          underlyingTokenBalanceUsdc: bnOrZero(yearnVault?.underlyingTokenBalance.amountUsdc)
            .div(`1e+${USDC_PRECISION}`)
            .toString(),
        }
        return acc
      },
      {},
    )
  }, [vaults, yearn])

  return {
    vaultsWithoutBalance: mergedVaults,
    vaultsWithoutBalanceLoading: loading || yearnLoading || balancesLoading,
  }
}
