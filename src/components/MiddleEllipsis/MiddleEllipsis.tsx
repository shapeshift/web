import type { FlexProps } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'
import { firstFourLastFour } from 'state/slices/portfolioSlice/utils'

type MiddleEllipsisProps = {
  value: string
  shouldShorten?: boolean
} & FlexProps

export const MiddleEllipsis = ({ value, shouldShorten = true, ...rest }: MiddleEllipsisProps) => {
  return (
    <Flex alignItems='center' whiteSpace='nowrap' {...rest}>
      <span style={{ lineHeight: 1 }}>{shouldShorten ? firstFourLastFour(value) : value}</span>
    </Flex>
  )
}
