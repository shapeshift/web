import { USDC_PRECISION } from 'constants/UsdcPrecision'
import { useMemo } from 'react'
import { useVaultWithoutBalance } from 'hooks/useVaultWithoutBalance/useVaultWithoutBalance'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { MergedSerializableOpportunity } from 'pages/Defi/hooks/useVaultBalances'
import { useVaultBalances } from 'pages/Defi/hooks/useVaultBalances'

export type VaultWithFiatAmount = MergedSerializableOpportunity & {
  fiatAmount?: string
}

export function useSortedVaults(): MergedSerializableOpportunity[] {
  const { vaults, loading } = useVaultBalances()
  const { vaultsWithoutBalance, vaultsWithoutBalanceLoading } = useVaultWithoutBalance()
  const TVL10M: number = 10_000_000
  const TVL1M: number = 1_000_000

  const computeResult = useMemo(() => {
    if (loading || vaultsWithoutBalanceLoading) {
      return []
    }

    const updatedVaults: VaultWithFiatAmount[] = Object.values(vaultsWithoutBalance).map(x =>
      vaults[x.id]
        ? {
            ...x,
            fiatAmount: vaults[x.id].fiatAmount,
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

      const vaultATVL = bnOrZero(vaultA.tvl.balanceUsdc).div(`1e+${USDC_PRECISION}`)
      const vaultBTVL = bnOrZero(vaultB.tvl.balanceUsdc).div(`1e+${USDC_PRECISION}`)

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

  function compareVaultApy(vaultA: VaultWithFiatAmount, vaultB: VaultWithFiatAmount): number {
    return bnOrZero(vaultA.apy).gt(bnOrZero(vaultB.apy)) ? -1 : 1
  }

  return computeResult
}
