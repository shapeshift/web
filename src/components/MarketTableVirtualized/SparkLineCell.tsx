import { Box } from '@chakra-ui/react'
import { memo } from 'react'

import { SparkLine } from '@/pages/Buy/components/Sparkline'

type SparkLineCellProps = {
  assetId: string
  themeColor: string
}

export const SparkLineCell = memo<SparkLineCellProps>(({ assetId, themeColor }) => (
  <Box width='full'>
    <SparkLine assetId={assetId} themeColor={themeColor} height={35} />
  </Box>
))
