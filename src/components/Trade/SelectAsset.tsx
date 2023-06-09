import type { RouteComponentProps } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { Card } from 'components/Card/Card'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import type { Asset } from 'lib/asset-service'

import { TradeRoutePaths } from './types'
import { WithBackButton } from './WithBackButton'

type SelectAssetProps = {
  assets: Asset[]
  onClick: (asset: Asset) => void
} & RouteComponentProps

export const SelectAsset: React.FC<SelectAssetProps> = ({ assets, onClick, history }) => {
  const handleBack = () => {
    history.push(TradeRoutePaths.Input)
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
          <AssetSearch assets={assets} onClick={onClick} />
        </Card.Body>
      </Card>
    </SlideTransition>
  )
}
