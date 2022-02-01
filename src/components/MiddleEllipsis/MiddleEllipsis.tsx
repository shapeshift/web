import { Box, BoxProps } from '@chakra-ui/react'
import { firstFourLastFour } from 'state/slices/portfolioSlice/utils'

type MiddleEllipsisProps = {
  address: string
  shouldShorten?: boolean
} & BoxProps

export const MiddleEllipsis = ({ address, shouldShorten = true, ...rest }: MiddleEllipsisProps) => {
  return (
    <Box whiteSpace='nowrap' {...rest}>
      <span>{shouldShorten ? firstFourLastFour(address) : address}</span>
    </Box>
  )
}
