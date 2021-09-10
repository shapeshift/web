import { Flex } from '@chakra-ui/react'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/asset-service'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Page } from 'components/Layout/Page'

import { AssetMarketData, useGetAssetData } from '../../hooks/useAsset/useAsset'
import { AssetDetails } from './AssetDetails/AssetDetails'

export interface MatchParams {
  network: string
  address: string
}

export const Asset = () => {
  const [asset, setAsset] = useState<AssetMarketData>()
  const [loading, setLoading] = useState<boolean>(false)
  let { network, address } = useParams<MatchParams>()
  const getAssetData = useGetAssetData()
  const getPrice = useCallback(async () => {
    setLoading(true)
    const asset = await getAssetData({
      chain: ChainTypes.ETH,
      network: NetworkTypes.MAINNET,
      tokenId: address
    })
    if (asset) setAsset(asset)
    setLoading(false)
  }, [address, getAssetData])

  useEffect(() => {
    getPrice()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network, address])

  return (
    <Page style={{ flex: 1 }} loading={loading} error={!asset}>
      <Flex role='main' flex={1} height='100%'>
        {asset && <AssetDetails asset={asset} />}
      </Flex>
    </Page>
  )
}
