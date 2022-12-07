import type { SquareProps, TextProps } from '@chakra-ui/react'
import { Circle, Stack } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'

import type { BridgeChain } from '../types'

type ChainRowProps = {
  symbol: string
  labelProps?: TextProps
  iconProps?: SquareProps
} & BridgeChain

export const ChainRow: React.FC<ChainRowProps> = ({
  name,
  balance,
  fiatBalance,
  labelProps,
  iconProps,
  color,
  symbol,
}) => {
  return (
    <Stack flex={1} direction='row' width='full' alignItems='center' justifyContent='space-between'>
      <Stack direction='row' alignItems='center'>
        <Circle size={8} borderWidth={2} borderColor={color} {...iconProps} />
        <RawText textTransform='capitalize' fontSize='md' {...labelProps}>
          {name}
        </RawText>
      </Stack>
      <Stack spacing={0} ml='auto' alignItems='flex-end' fontSize='sm'>
        <Amount.Fiat value={fiatBalance} />
        <Amount.Crypto color='gray.500' value={balance} symbol={symbol} />
      </Stack>
    </Stack>
  )
}
