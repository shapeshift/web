import { Grid, GridItem, Skeleton } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { noop } from 'lodash'

import {
  colSpanSmallSx,
  colSpanSparklineSx,
  colSpanSx,
  gridTemplateColumnSx,
  gridTemplateRowsSx,
  rowSpanSparklineSx,
} from '../constants'
import { AssetCard } from './AssetCard'
import { CardWithSparkline } from './CardWithSparkline'

type LoadingGridProps = {
  showSparkline?: boolean
}

export const LoadingGrid: React.FC<LoadingGridProps> = ({ showSparkline }) => (
  <Grid templateRows={gridTemplateRowsSx} gridTemplateColumns={gridTemplateColumnSx} gap={4}>
    {new Array(showSparkline ? 7 : 8).fill(null).map((_, index) => {
      if (showSparkline) {
        return index === 0 ? (
          <GridItem key={index} rowSpan={rowSpanSparklineSx} colSpan={colSpanSparklineSx}>
            <Skeleton isLoaded={false}>
              <CardWithSparkline assetId={ethAssetId} onClick={noop} />
            </Skeleton>
          </GridItem>
        ) : (
          <GridItem key={index} colSpan={index <= 6 ? colSpanSmallSx : colSpanSx}>
            <Skeleton isLoaded={false}>
              <AssetCard assetId={ethAssetId} onClick={noop} />
            </Skeleton>
          </GridItem>
        )
      }

      return (
        <GridItem key={index} colSpan={colSpanSx}>
          <Skeleton isLoaded={false}>
            <AssetCard assetId={ethAssetId} onClick={noop} />
          </Skeleton>
        </GridItem>
      )
    })}
  </Grid>
)
