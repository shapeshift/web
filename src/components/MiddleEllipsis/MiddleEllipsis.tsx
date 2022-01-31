import { Box, BoxProps } from '@chakra-ui/react'
import React from 'react'

type MiddleEllipsisProps = {
  address: string
} & BoxProps

export const MiddleEllipsis = ({ address, ...rest }: MiddleEllipsisProps) => {
  return (
    <Box whiteSpace='nowrap' {...rest}>
      <span>{shortenAddress(address)}</span>
    </Box>
  )
}

export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= 40) {
    return address
  }
  return `${address.substring(0, chars + 2)}...${address.slice(-4)}`
}
