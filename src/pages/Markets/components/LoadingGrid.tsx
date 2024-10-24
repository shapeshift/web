import { GridItem, Skeleton } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { noop } from 'lodash'

import { AssetCard } from './AssetCard'
import { CardWithSparkline } from './CardWithSparkline'
import { MarketGrid } from './MarketGrid'

type LoadingGridProps = {
  showSparkline?: boolean
}

export const LoadingGrid: React.FC<LoadingGridProps> = ({ showSparkline }) => (
  <MarketGrid>
    {new Array(showSparkline ? 7 : 8).fill(null).map((_, index) => {
      if (showSparkline) {
        return index === 0 ? (
          <GridItem key={index} rowSpan={2} colSpan={2}>
            <Skeleton isLoaded={false} height='full'>
              <CardWithSparkline assetId={ethAssetId} onClick={noop} />
            </Skeleton>
          </GridItem>
        ) : (
          <GridItem key={index}>
            <Skeleton isLoaded={false} height='full'>
              <AssetCard assetId={ethAssetId} onClick={noop} />
            </Skeleton>
          </GridItem>
        )
      }

      return (
        <GridItem key={index}>
          <Skeleton isLoaded={false}>
            <AssetCard assetId={ethAssetId} onClick={noop} />
          </Skeleton>
        </GridItem>
      )
    })}
  </MarketGrid>
)
