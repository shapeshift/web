import type { Asset } from '@keepkey/asset-service'
import type { RouteComponentProps } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { Card } from 'components/Card/Card'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { TradeRoutePaths } from './types'
import { WithBackButton } from './WithBackButton'

type SelectAssetProps = {
  onClick: (asset: Asset) => void
  filterBy: (assets: Asset[]) => Asset[] | undefined
} & RouteComponentProps

export const SelectAsset: React.FC<SelectAssetProps> = ({ onClick, history, filterBy }) => {
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
          <AssetSearch onClick={onClick} filterBy={filterBy} />
        </Card.Body>
      </Card>
    </SlideTransition>
  )
}
