import { caip2 } from '@shapeshiftoss/caip'
import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { RouteComponentProps } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { Card } from 'components/Card/Card'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { WithBackButton } from './WithBackButton'

type SelectAssetProps = { onClick: (asset: Asset) => void } & RouteComponentProps

export const SelectAsset = ({ onClick, history }: SelectAssetProps) => {
  // Filters the asset search to only show eth/erc20 assets
  const ethCAIP2 = caip2.toCAIP2({ chain: ChainTypes.Ethereum, network: NetworkTypes.MAINNET })
  const filterByCaip19 = (assets: Asset[]): Asset[] => {
    return assets.filter(
      ({ chain, network }: Asset) => caip2.toCAIP2({ chain, network }) === ethCAIP2
    )
  }

  const handleBack = () => {
    history.push('/trade/input')
  }

  return (
    <SlideTransition>
      <Card variant='unstyled'>
        <Card.Header px={0} pt={0}>
          <WithBackButton handleBack={handleBack}>
            <Card.Heading textAlign='center'>
              <Text translation='assets.assetCards.assetActions.trade' />
            </Card.Heading>
          </WithBackButton>
        </Card.Header>
        <Card.Body p={0} height='400px' display='flex' flexDir='column'>
          <AssetSearch onClick={onClick} filterBy={filterByCaip19} />
        </Card.Body>
      </Card>
    </SlideTransition>
  )
}
