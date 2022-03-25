import { AssetNamespace, CAIP19, caip19 } from '@shapeshiftoss/caip'
import { DefiType, FoxyApi } from '@shapeshiftoss/investor-foxy'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import { PortfolioBalancesById } from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectAssets,
  selectMarketData,
  selectPortfolioAssetBalances,
  selectPortfolioLoading
} from 'state/slices/selectors'

export type FoxyOpportunity = {
  type: DefiType
  provider: string
  version: string
  contractAddress: string
  rewardToken: string
  stakingToken: string
  chain: ChainTypes
  tvl?: BigNumber
  expired?: boolean
  apy?: string
  balance: string
  contractCaip19: CAIP19
  tokenCaip19: CAIP19
  rewardTokenCaip19: CAIP19
  pricePerShare: BigNumber
}

export type MergedFoxyOpportunity = FoxyOpportunity & {
  cryptoAmount: string
  fiatAmount: string
}
export type UseFoxyBalancesReturn = {
  opportunities: MergedFoxyOpportunity[]
  totalBalance: string
  loading: boolean
}

async function getFoxyOpportunities(balances: PortfolioBalancesById, api: FoxyApi) {
  const acc: Record<string, FoxyOpportunity> = {}
  const opps = await api.getFoxyOpportunities()
  for (let index = 0; index < opps.length; index++) {
    const opportunity = opps[index]
    const rewardTokenCaip19 = caip19.toCAIP19({
      chain: opportunity.chain,
      network: NetworkTypes.MAINNET,
      assetNamespace: AssetNamespace.ERC20,
      assetReference: opportunity.rewardToken
    })
    const contractCaip19 = caip19.toCAIP19({
      chain: opportunity.chain,
      network: NetworkTypes.MAINNET,
      assetNamespace: AssetNamespace.ERC20,
      assetReference: opportunity.contractAddress
    })
    const tokenCaip19 = caip19.toCAIP19({
      chain: opportunity.chain,
      network: NetworkTypes.MAINNET,
      assetNamespace: AssetNamespace.ERC20,
      assetReference: opportunity.stakingToken
    })
    const balance = balances[rewardTokenCaip19]

    const pricePerShare = api.pricePerShare()
    acc[opportunity.contractAddress] = {
      ...opportunity,
      balance: bnOrZero(balance).toString(),
      contractCaip19,
      tokenCaip19,
      rewardTokenCaip19,
      pricePerShare: bnOrZero(pricePerShare)
    }
  }
  return acc
}

export function useFoxyBalances(): UseFoxyBalancesReturn {
  const {
    state: { wallet }
  } = useWallet()
  const [loading, setLoading] = useState(false)
  const [opportunities, setOpportunites] = useState<Record<string, FoxyOpportunity>>({})
  const marketData = useSelector(selectMarketData)
  const assets = useSelector(selectAssets)

  const { foxy, loading: foxyLoading } = useFoxy()
  const balances = useSelector(selectPortfolioAssetBalances)
  const balancesLoading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    if (!wallet || !foxy) return
    ;(async () => {
      setLoading(true)
      try {
        const foxyOpportunities = await getFoxyOpportunities(balances, foxy)
        setOpportunites(foxyOpportunities)
      } catch (error) {
        console.error('error', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [wallet, foxyLoading, foxy, balances, balancesLoading])

  const makeFiatAmount = useCallback(
    (opportunity: FoxyOpportunity) => {
      const asset = assets[opportunity.tokenCaip19]
      const pricePerShare = bnOrZero(opportunity.pricePerShare).div(`1e+${asset?.precision}`)
      const marketPrice = marketData[opportunity.tokenCaip19]?.price
      return bnOrZero(opportunity.balance)
        .div(`1e+${asset?.precision}`)
        .times(pricePerShare)
        .times(bnOrZero(marketPrice))
    },
    [assets, marketData]
  )

  const totalBalance = useMemo(
    () =>
      Object.values(opportunities).reduce((acc: BigNumber, opportunity: FoxyOpportunity) => {
        const amount = makeFiatAmount(opportunity)
        return acc.plus(bnOrZero(amount))
      }, bnOrZero(0)),
    [makeFiatAmount, opportunities]
  )

  const mergedOpportunities = useMemo(() => {
    return Object.values(opportunities).map(opportunity => {
      const asset = assets[opportunity.tokenCaip19]
      const fiatAmount = makeFiatAmount(opportunity)
      const marketPrice = marketData[opportunity.tokenCaip19]?.price
      const tvl = bnOrZero(opportunity.tvl).div(`1e+${asset?.precision}`).times(marketPrice)
      const data = {
        ...opportunity,
        tvl,
        cryptoAmount: bnOrZero(opportunity.balance).div(`1e+${asset?.precision}`).toString(),
        fiatAmount: fiatAmount.toString()
      }
      return data
    })
  }, [assets, makeFiatAmount, marketData, opportunities])

  return {
    opportunities: mergedOpportunities,
    loading: foxyLoading || loading,
    totalBalance: totalBalance.toString()
  }
}
