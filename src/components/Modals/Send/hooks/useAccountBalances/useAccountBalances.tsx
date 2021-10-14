import { Asset, BalanceResponse, MarketData, Token } from '@shapeshiftoss/types'
import { useEffect, useMemo, useState } from 'react'
import { useGetAssetData } from 'hooks/useAsset/useAsset'
import { bnOrZero } from 'lib/bignumber/bignumber'

type UseAccountBalancesProps = {
  asset: Asset
  balances: Record<string, Partial<BalanceResponse & Token>>
}

export const useAccountBalances = ({ asset, balances }: UseAccountBalancesProps) => {
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const getAssetData = useGetAssetData({
    chain: asset.chain,
    tokenId: asset.tokenId
  })
  const assetBalance = asset?.tokenId ? balances[asset?.tokenId] : balances[asset.chain]

  useEffect(() => {
    ;(async () => {
      const data = await getAssetData({
        chain: asset.chain,
        tokenId: asset.tokenId
      })
      setMarketData(data)
    })()
  }, [asset.chain, asset.tokenId]) // eslint-disable-line react-hooks/exhaustive-deps

  const accountBalances = useMemo(() => {
    const crypto = bnOrZero(assetBalance?.balance).div(`1e${asset.precision}`)
    const fiat = crypto.times(marketData?.price || 0)
    return {
      crypto,
      fiat
    }
  }, [assetBalance, marketData, asset])

  return { assetBalance, accountBalances }
}
