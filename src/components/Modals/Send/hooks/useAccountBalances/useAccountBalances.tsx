import { Asset, NetworkTypes } from '@shapeshiftoss/asset-service'
import { BalanceResponse, Token } from '@shapeshiftoss/chain-adapters'
import { useEffect, useMemo, useState } from 'react'
import { AssetMarketData, useGetAssetData } from 'hooks/useAsset/useAsset'
import { bnOrZero } from 'lib/bignumber/bignumber'

type UseAccountBalancesProps = {
  asset: Asset
  balances: Record<string, Partial<BalanceResponse & Token>>
}

export const useAccountBalances = ({ asset, balances }: UseAccountBalancesProps) => {
  const [assetData, setAssetData] = useState<AssetMarketData>()
  const getAssetData = useGetAssetData()
  const assetBalance = asset?.tokenId ? balances[asset?.tokenId] : balances[asset.chain]

  useEffect(() => {
    ;(async () => {
      const data = await getAssetData({
        chain: asset.chain,
        network: NetworkTypes.MAINNET,
        tokenId: asset.tokenId
      })
      setAssetData(data)
    })()
  }, [asset.chain, asset.tokenId]) // eslint-disable-line react-hooks/exhaustive-deps

  const accountBalances = useMemo(() => {
    const crypto = bnOrZero(assetBalance?.balance).div(`1e${asset.precision}`)
    const fiat = crypto.times(assetData?.price || 0)
    return {
      crypto,
      fiat
    }
  }, [assetBalance, assetData, asset])

  return { assetBalance, accountBalances }
}
