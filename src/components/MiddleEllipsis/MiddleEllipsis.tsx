import { Box, BoxProps } from '@chakra-ui/react'
import React from 'react'
import ReactMiddleEllipsis from 'react-middle-ellipsis'

type MiddleEllipsisProps = {
  children: React.ReactNode
} & ({ maxWidth: string } | { width: string }) &
  BoxProps

export const MiddleEllipsis = ({ children, maxWidth, width, ...rest }: MiddleEllipsisProps) => {
  return (
    <Box whiteSpace='nowrap' maxWidth={maxWidth} width={width} {...rest}>
      <ReactMiddleEllipsis>
        <span>{children}</span>
      </ReactMiddleEllipsis>
    </Box>
  )
}
