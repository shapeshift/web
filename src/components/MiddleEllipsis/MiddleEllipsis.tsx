import { Flex, FlexProps } from '@chakra-ui/react'
import { firstFourLastFour } from 'state/slices/portfolioSlice/utils'

type MiddleEllipsisProps = {
  address: string
  shouldShorten?: boolean
} & FlexProps

export const MiddleEllipsis = ({ address, shouldShorten = true, ...rest }: MiddleEllipsisProps) => {
  return (
    <Flex alignItems='center' whiteSpace='nowrap' {...rest}>
      <span style={{ lineHeight: 1 }}>{shouldShorten ? firstFourLastFour(address) : address}</span>
    </Flex>
  )
}
