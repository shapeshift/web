import { Box, BoxProps } from '@chakra-ui/react'
import React from 'react'
import { isAddress } from 'web3-utils'

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
  const parsed = isAddress(address)
  if (!parsed) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`
}
