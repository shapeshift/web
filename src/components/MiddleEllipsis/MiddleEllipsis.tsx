import type { FlexProps } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'

import { middleEllipsis } from '@/lib/utils'

type MiddleEllipsisProps = {
  value: string
  shouldShorten?: boolean
} & FlexProps

export const MiddleEllipsis = ({ value, shouldShorten = true, ...rest }: MiddleEllipsisProps) => {
  return (
    <Flex alignItems='center' whiteSpace='nowrap' {...rest}>
      <span style={{ lineHeight: 1 }}>{shouldShorten ? middleEllipsis(value) : value}</span>
    </Flex>
  )
}
