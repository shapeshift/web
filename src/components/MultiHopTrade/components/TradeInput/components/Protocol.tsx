import { ArrowUpDownIcon } from '@chakra-ui/icons'
import { Skeleton, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'

import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { clickableLinkSx } from '@/theme/styles'

type ProtocolProps = {
  onClick: () => void
  title?: string
  icon?: React.ReactNode
  isLoading?: boolean
}

export const Protocol = ({ onClick, title, icon, isLoading }: ProtocolProps) => {
  const content = useMemo(() => {
    if (isLoading) {
      return <Skeleton height='20px' width='60px' />
    }
    if (!title) {
      return <RawText>-</RawText>
    }

    return (
      <>
        {icon}
        <Stack
          direction='row'
          spacing={1}
          alignItems='center'
          cursor='pointer'
          sx={clickableLinkSx}
          onClick={onClick}
        >
          <RawText>{title ?? '-'}</RawText>
          <ArrowUpDownIcon color='gray.500' />
        </Stack>
      </>
    )
  }, [icon, title, isLoading, onClick])

  return (
    <Row alignItems='center' fontSize='sm'>
      <Row.Label>
        <Text translation='trade.protocol' />
      </Row.Label>
      <Row.Value display='flex' gap={2}>
        {content}
      </Row.Value>
    </Row>
  )
}
