import { CAIP19, caip19 } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { YearnVaultApi } from 'features/defi/providers/yearn/api/api'
import {
  SUPPORTED_VAULTS,
  SupportedYearnVault
} from 'features/defi/providers/yearn/constants/vaults'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssets } from 'state/slices/assetsSlice/assetsSlice'
import { selectMarketData } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  PortfolioBalancesById,
  selectPortfolioAssetBalances,
  selectPortfolioLoading
} from 'state/slices/portfolioSlice/portfolioSlice'

export type EarnVault = Partial<chainAdapters.Account<ChainTypes>> &
  SupportedYearnVault & { vaultCaip19: CAIP19; tokenCaip19: CAIP19; pricePerShare: BigNumber }

async function getYearnVaults(balances: PortfolioBalancesById, yearn: YearnVaultApi | null) {
  const acc: Record<string, EarnVault> = {}
  for (let index = 0; index < SUPPORTED_VAULTS.length; index++) {
    // TODO: caip indentifiers in SUPPORTED_VAULTS
    const vault = SUPPORTED_VAULTS[index]
    const vaultCaip19 = caip19.toCAIP19({
      chain: vault.chain,
      network: NetworkTypes.MAINNET,
      contractType: ContractTypes.ERC20,
      tokenId: vault.vaultAddress
    })
    const tokenCaip19 = caip19.toCAIP19({
      chain: vault.chain,
      network: NetworkTypes.MAINNET,
      contractType: ContractTypes.ERC20,
      tokenId: vault.tokenAddress
    })
    const balance = balances[vaultCaip19]

    if (balance) {
      const pricePerShare = await yearn?.pricePerShare({ vaultAddress: vault.vaultAddress })
      acc[vault.vaultAddress] = {
        ...vault,
        balance,
        vaultCaip19,
        tokenCaip19,
        pricePerShare: bnOrZero(pricePerShare)
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
      const asset = assets[vault.vaultCaip19]
      const pricePerShare = bnOrZero(vault.pricePerShare).div(`1e+${asset?.precision}`)
      const marketPrice = marketData[vault.tokenCaip19]?.price
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
        const asset = assets[vault.vaultCaip19]
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
