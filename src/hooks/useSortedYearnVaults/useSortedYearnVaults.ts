import { SupportedYearnVault } from '@shapeshiftoss/investor-yearn'
import { useMemo } from 'react'
import { useVaultWithoutBalance } from 'hooks/useVaultWithoutBalance/useVaultWithoutBalance'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useVaultBalances } from 'pages/Defi/hooks/useVaultBalances'

export type YearnVaultWithApyAndTvl = SupportedYearnVault & {
  apy?: number
  underlyingTokenBalanceUsdc?: string
  fiatAmount?: string
}

export function useSortedYearnVaults(): SupportedYearnVault[] {
  const { vaults, loading } = useVaultBalances()
  const { vaultsWithoutBalance, vaultsWithoutBalanceLoading } = useVaultWithoutBalance()
  const TVL10M: number = 10_000_000
  const TVL1M: number = 1_000_000

  const computeResult = useMemo(() => {
    if (loading || vaultsWithoutBalanceLoading) {
      return []
    }

    const updatedVaults: YearnVaultWithApyAndTvl[] = Object.values(vaultsWithoutBalance).map(x =>
      vaults[x.vaultAddress]
        ? {
            ...x,
            apy: vaults[x.vaultAddress].apy,
            underlyingTokenBalanceUsdc: vaults[x.vaultAddress].underlyingTokenBalanceUsdc,
            fiatAmount: vaults[x.vaultAddress].fiatAmount,
          }
        : x,
    )

    return updatedVaults.sort((vaultA, vaultB) => {
      const vaultABalance = bnOrZero(vaultA.fiatAmount)
      const vaultBBalance = bnOrZero(vaultB.fiatAmount)
      if (vaultABalance.gt(0) && vaultBBalance.gt(0)) {
        return vaultABalance.gt(vaultBBalance) ? -1 : 1
      }

      if (vaultABalance.gt(0) || vaultBBalance.gt(0)) {
        return vaultABalance.gt(0) ? -1 : 1
      }

      const vaultATVL = bnOrZero(vaultA.underlyingTokenBalanceUsdc)
      const vaultBTVL = bnOrZero(vaultB.underlyingTokenBalanceUsdc)

      if (vaultATVL.gt(TVL10M) && vaultBTVL.gt(TVL10M)) {
        return compareVaultApy(vaultA, vaultB)
      }

      if (vaultATVL.gt(TVL10M)) {
        return -1
      }

      if (vaultBTVL.gt(TVL10M)) {
        return 1
      }

      if (vaultATVL.gt(TVL1M) && vaultBTVL.gt(TVL1M)) {
        return compareVaultApy(vaultA, vaultB)
      }

      if (vaultATVL.gt(TVL1M)) {
        return -1
      }

      if (vaultBTVL.gt(TVL1M)) {
        return 1
      }

      return compareVaultApy(vaultA, vaultB)
    })
  }, [vaults, vaultsWithoutBalance, loading, vaultsWithoutBalanceLoading])

  function compareVaultApy(
    vaultA: YearnVaultWithApyAndTvl,
    vaultB: YearnVaultWithApyAndTvl,
  ): number {
    return bnOrZero(vaultA.apy).gt(bnOrZero(vaultB.apy)) ? -1 : 1
  }

  return computeResult
}
