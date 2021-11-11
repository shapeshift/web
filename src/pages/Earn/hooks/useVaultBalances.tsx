import { chainAdapters, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useYearn } from 'features/earn/contexts/YearnProvider/YearnProvider'
import { YearnVaultApi } from 'features/earn/providers/yearn/api/api'
import {
  SUPPORTED_VAULTS,
  SupportedYearnVault
} from 'features/earn/providers/yearn/constants/vaults'
import { toLower } from 'lodash'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import { ReduxState } from 'state/reducer'
import { fetchAsset } from 'state/slices/assetsSlice/assetsSlice'
import { fetchMarketData } from 'state/slices/marketDataSlice/marketDataSlice'

export type EarnVault = Partial<chainAdapters.Account<ChainTypes>> &
  SupportedYearnVault & { pricePerShare: BigNumber }

async function getYearnVaults(
  balances: Record<string, Partial<chainAdapters.Account<ChainTypes>>>,
  yearn: YearnVaultApi | null
) {
  const acc: Record<string, EarnVault> = {}
  for (let index = 0; index < SUPPORTED_VAULTS.length; index++) {
    const vault = SUPPORTED_VAULTS[index]
    const balance = balances[toLower(vault.vaultAddress)]

    if (balance) {
      const pricePerShare = await yearn?.pricePerShare({ vaultAddress: vault.vaultAddress })
      acc[vault.vaultAddress] = {
        ...vault,
        ...balance,
        pricePerShare: pricePerShare || bnOrZero(0)
      }
    }
  }
  return acc
}

export type MergedEarnVault = EarnVault & {
  cryptoAmount: string
  fiatAmount: string
  apy?: number
}

export type UseVaultBalancesReturn = {
  vaults: Record<string, MergedEarnVault>
  totalBalance: string
  loading: boolean
}

export function useVaultBalances(): UseVaultBalancesReturn {
  const {
    state: { wallet }
  } = useWallet()
  const [loading, setLoading] = useState(false)
  const [vaults, setVaults] = useState<Record<string, EarnVault>>({})
  const marketData = useSelector((state: ReduxState) => state.marketData.marketData)
  const assets = useSelector((state: ReduxState) => state.assets)
  const dispatch = useDispatch()

  const { yearn, loading: yearnLoading } = useYearn()
  const { balances, loading: balancesLoading } = useFlattenedBalances()

  useEffect(() => {
    if (!wallet || yearnLoading || balancesLoading) return
    ;(async () => {
      setLoading(true)
      try {
        const yearnVaults = await getYearnVaults(balances, yearn)
        // get asset and market data for all underlying assets/vault assets
        Object.values(yearnVaults).forEach(vault => {
          dispatch(
            fetchAsset({
              chain: vault.chain,
              network: NetworkTypes.MAINNET,
              tokenId: vault.vaultAddress
            })
          )
          dispatch(
            fetchAsset({
              chain: vault.chain,
              network: NetworkTypes.MAINNET,
              tokenId: vault.tokenAddress
            })
          )
          dispatch(fetchMarketData({ chain: vault.chain, tokenId: vault.tokenAddress }))
        })
        setVaults(yearnVaults)
      } catch (error) {
        console.error('error', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [balances, dispatch, wallet, balancesLoading, yearnLoading, yearn])

  const makeVaultFiatAmount = useCallback(
    vault => {
      const vaultAddress = vault.vaultAddress
      const asset = assets[vaultAddress]
      const pricePerShare = bnOrZero(vault.pricePerShare).div(`1e+${asset?.precision}`)
      const marketPrice = marketData[vault.tokenAddress]?.price
      return bnOrZero(vault.balance)
        .div(`1e+${asset?.precision}`)
        .times(pricePerShare)
        .times(bnOrZero(marketPrice))
    },
    [assets, marketData]
  )

  const totalBalance = useMemo(
    () =>
      Object.values(vaults).reduce((acc: BigNumber, vault: EarnVault) => {
        const amount = makeVaultFiatAmount(vault)
        return acc.plus(bnOrZero(amount))
      }, bnOrZero(0)),
    [makeVaultFiatAmount, vaults]
  )

  const mergedVaults = useMemo(() => {
    return Object.entries(vaults).reduce(
      (acc: Record<string, MergedEarnVault>, [vaultAddress, vault]) => {
        const asset = assets[vaultAddress]
        const fiatAmount = makeVaultFiatAmount(vault)
        const yearnVault = yearn?.findByVaultTokenId(vaultAddress)
        acc[vaultAddress] = {
          ...vault,
          cryptoAmount: bnOrZero(vault.balance).div(`1e+${asset?.precision}`).toString(),
          fiatAmount: fiatAmount.toString(),
          apy: yearnVault?.apy.net_apy
        }
        return acc
      },
      {}
    )
  }, [assets, makeVaultFiatAmount, vaults, yearn])

  return {
    vaults: mergedVaults,
    totalBalance: totalBalance.toString(),
    loading: loading || yearnLoading || balancesLoading
  }
}
