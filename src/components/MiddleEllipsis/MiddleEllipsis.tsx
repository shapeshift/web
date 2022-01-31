import { Box, BoxProps } from '@chakra-ui/react'

type MiddleEllipsisProps = {
  address: string
  shouldShorten?: boolean
} & BoxProps

export const MiddleEllipsis = ({ address, shouldShorten = true, ...rest }: MiddleEllipsisProps) => {
  return (
    <Box whiteSpace='nowrap' {...rest}>
      <span>{shouldShorten ? shortenAddress(address) : address}</span>
    </Box>
  )
}

export function shortenAddress(address: string): string {
  return `${address.substring(0, 6)}...${address.slice(-4)}`
}
