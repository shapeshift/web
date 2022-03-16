import { DefiType } from '@shapeshiftoss/investor-foxy'
import { ChainTypes } from '@shapeshiftoss/types'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { useEffect, useState } from 'react'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { BigNumber } from 'lib/bignumber/bignumber'

export type FoxOpportunity = {
  type: DefiType
  provider: string
  version: string
  contractAddress: string
  foxyAddress: string
  foxAddress: string
  chain: ChainTypes
  tvl: BigNumber
  apy: string
  expired: boolean
}
export type UseFoxyBalancesReturn = {
  opportunities: FoxOpportunity[]
  loading: boolean
}

export function useFoxyBalances(): UseFoxyBalancesReturn {
  const {
    state: { wallet }
  } = useWallet()
  const [loading, setLoading] = useState(false)
  const [opportunities, setOpportunites] = useState<FoxOpportunity[]>([])

  const { foxy, loading: foxyLoading } = useFoxy()

  useEffect(() => {
    if (!wallet || !foxy) return
    ;(async () => {
      setLoading(true)
      try {
        const foxyOpportunities = await foxy.getFoxyOpportunities()
        setOpportunites(foxyOpportunities)
      } catch (error) {
        console.error('error', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [wallet, foxyLoading, foxy])

  // const makeVaultFiatAmount = useCallback(
  //   (vault: EarnVault) => {
  //     const asset = assets[vault.vaultCaip19]
  //     const pricePerShare = bnOrZero(vault.pricePerShare).div(`1e+${asset?.precision}`)
  //     const marketPrice = marketData[vault.tokenCaip19]?.price
  //     return bnOrZero(vault.balance)
  //       .div(`1e+${asset?.precision}`)
  //       .times(pricePerShare)
  //       .times(bnOrZero(marketPrice))
  //   },
  //   [assets, marketData]
  // )

  // const totalBalance = useMemo(
  //   () =>
  //     Object.values(vaults).reduce((acc: BigNumber, vault: EarnVault) => {
  //       const amount = makeVaultFiatAmount(vault)
  //       return acc.plus(bnOrZero(amount))
  //     }, bnOrZero(0)),
  //   [makeVaultFiatAmount, vaults]
  // )

  // const mergedVaults = useMemo(() => {
  //   return Object.entries(vaults).reduce(
  //     (acc: Record<string, MergedEarnVault>, [vaultAddress, vault]) => {
  //       const asset = assets[vault.vaultCaip19]
  //       const fiatAmount = makeVaultFiatAmount(vault)
  //       const yearnVault = yearn?.findByVaultTokenId(vaultAddress)
  //       acc[vaultAddress] = {
  //         ...vault,
  //         cryptoAmount: bnOrZero(vault.balance).div(`1e+${asset?.precision}`).toString(),
  //         fiatAmount: fiatAmount.toString(),
  //         apy: yearnVault?.metadata?.apy?.net_apy,
  //         underlyingTokenBalanceUsdc: bnOrZero(yearnVault?.underlyingTokenBalance.amountUsdc)
  //           .div(`1e+${USDC_PRECISION}`)
  //           .toString()
  //       }
  //       return acc
  //     },
  //     {}
  //   )
  // }, [assets, makeVaultFiatAmount, vaults, yearn])

  return {
    opportunities,
    loading: foxyLoading || loading
  }
}
