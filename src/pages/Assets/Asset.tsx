import { Flex } from '@chakra-ui/react'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { Page } from 'components/Layout/Page'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'
import { ReduxState } from 'state/reducer'
import { fetchMarketData } from 'state/slices/marketDataSlice/marketDataSlice'

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
  description: '',
  caip19: ''
}

export const Asset = () => {
  const [isLoaded, setIsLoaded] = useStateIfMounted<boolean>(false)
  const { chain, tokenId } = useParams<MatchParams>()
  const marketData = useSelector((state: ReduxState) => state.marketData[tokenId ?? chain])
  const dispatch = useDispatch()

  const asset = useFetchAsset({ chain, tokenId })

  useEffect(() => {
    ;(async () => {
      setIsLoaded(false)
      setTimeout(async () => {
        dispatch(
          fetchMarketData({
            chain,
            tokenId
          })
        )
        setIsLoaded(true)
      }, 750)
    })()
  }, [chain, tokenId]) // eslint-disable-line react-hooks/exhaustive-deps

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
