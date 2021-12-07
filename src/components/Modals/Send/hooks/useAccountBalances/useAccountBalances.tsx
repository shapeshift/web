import { Asset, ChainTypes, MarketData } from '@shapeshiftoss/types'
import { chainAdapters } from '@shapeshiftoss/types'
import { useEffect, useMemo, useState } from 'react'
import { useGetAssetData } from 'hooks/useAsset/useAsset'
import { bnOrZero } from 'lib/bignumber/bignumber'

type UseAccountBalancesProps = {
  asset: Asset
  // TODO(0xdef1cafe): remove this coupling to ethereum specific tokens
  balances: Record<
    string,
    Partial<chainAdapters.Account<ChainTypes> & chainAdapters.ethereum.Token>
  >
}

export const useAccountBalances = ({ asset, balances }: UseAccountBalancesProps) => {
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const getAssetData = useGetAssetData(asset.caip19)
  const assetBalance = asset?.tokenId ? balances[asset?.tokenId] : balances[asset.chain]

  useEffect(() => {
    ;(async () => {
      const data = await getAssetData()
      setMarketData(data)
    })()
  }, [asset.caip19]) // eslint-disable-line react-hooks/exhaustive-deps

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
