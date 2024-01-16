import { Stack } from '@chakra-ui/react'
import React from 'react'

type RemoveLiquidityProps = {
  headerComponent?: JSX.Element
}
export const RemoveLiquidity: React.FC<RemoveLiquidityProps> = ({ headerComponent }) => {
  return <Stack>{headerComponent}</Stack>
}
