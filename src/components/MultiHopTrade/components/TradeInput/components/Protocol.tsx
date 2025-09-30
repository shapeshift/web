import { ArrowUpDownIcon } from '@chakra-ui/icons'
import { Stack } from '@chakra-ui/react'

import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { clickableLinkSx } from '@/theme/styles'

type ProtocolProps = {
  onClick: () => void
  title: string | undefined
  icon: React.ReactNode
}

export const Protocol = ({ onClick, title, icon }: ProtocolProps) => {
  if (!title || !icon) return null

  return (
    <Row alignItems='center' fontSize='sm'>
      <Row.Label>
        <Text translation='trade.protocol' />
      </Row.Label>
      <Row.Value display='flex' gap={2}>
        {icon}
        <Stack
          direction='row'
          spacing={1}
          alignItems='center'
          cursor='pointer'
          sx={clickableLinkSx}
          onClick={onClick}
        >
          <RawText>{title}</RawText>
          <ArrowUpDownIcon color='gray.500' />
        </Stack>
      </Row.Value>
    </Row>
  )
}
