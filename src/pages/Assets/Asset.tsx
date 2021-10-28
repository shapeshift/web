/* eslint-disable no-console */
import { Flex } from '@chakra-ui/react'
import { ChainTypes, MarketData, NetworkTypes } from '@shapeshiftoss/types'
import { useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router-dom'
import { Page } from 'components/Layout/Page'
import { ALLOWED_CHAINS, useGetAssetData } from 'hooks/useAsset/useAsset'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'
import { ReduxState } from 'state/reducer'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'

import { AssetDetails } from './AssetDetails/AssetDetails'
export interface MatchParams {
  chain: ChainTypes
  tokenId: string
}

const initAsset = {
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  symbol: '',
  name: '',
  precision: 18,
  color: '',
  secondaryColor: '',
  icon: '',
  sendSupport: true,
  receiveSupport: true,
  price: '',
  marketCap: '',
  volume: '',
  changePercent24Hr: 0,
  slip44: 60,
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  description: ''
}

export const Asset = () => {
  const dispatch = useDispatch()

  const [isLoaded, setIsLoaded] = useStateIfMounted<boolean>(false)
  const [marketData, setMarketData] = useStateIfMounted<MarketData | undefined>(undefined)
  const { chain, tokenId } = useParams<MatchParams>()
  const getAssetData = useGetAssetData({ chain, tokenId })
  const asset = useSelector((state: ReduxState) => state.assets[tokenId ?? chain])
  const preference = useSelector((state: ReduxState) => state.preferences.key1)

  console.log('preference', preference)

  const getPrice = useCallback(async () => {
    if (ALLOWED_CHAINS[chain]) {
      const market = await getAssetData({
        chain,
        tokenId
      })
      if (market) setMarketData(market)
    }
  }, [tokenId, getAssetData, chain]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ;(async () => {
      setIsLoaded(false)
      setTimeout(async () => {
        await getPrice()
        setIsLoaded(true)
      }, 750)
    })()
  }, [chain, tokenId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    dispatch(preferences.actions.setPreference({ key: 'key1', value: 'value1' }))
  }, [])

  return (
    <Page style={{ flex: 1 }} key={tokenId}>
      <Flex role='main' flex={1} height='100%'>
        <AssetDetails
          asset={asset && marketData ? { ...asset, ...marketData } : initAsset}
          isLoaded={isLoaded}
        />
      </Flex>
    </Page>
  )
}
