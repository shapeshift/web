import { ArrowUpDownIcon } from '@chakra-ui/icons'
import { Stack } from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'

import { SwapperIcons } from '../../SwapperIcons'

import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { clickableLinkSx } from '@/theme/styles'

type ProtocolProps = {
  onClick: () => void
  swapSource: SwapSource | undefined
  swapperName: SwapperName | undefined
}

export const Protocol = ({ onClick, swapSource, swapperName }: ProtocolProps) => {
  if (!swapSource || !swapperName) return null

  return (
    <Row alignItems='center' fontSize='sm'>
      <Row.Label>
        <Text translation='trade.protocol' />
      </Row.Label>
      <Row.Value display='flex' gap={2}>
        <SwapperIcons swapperName={swapperName} swapSource={swapSource} />
        <Stack
          direction='row'
          spacing={1}
          alignItems='center'
          cursor='pointer'
          sx={clickableLinkSx}
          onClick={onClick}
        >
          <RawText>{swapSource}</RawText>
          <ArrowUpDownIcon color='gray.500' />
        </Stack>
      </Row.Value>
    </Row>
  )
}
