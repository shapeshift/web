import dayjs from 'dayjs'
import { RawText } from 'components/Text'

export const TransactionTime = ({ blockTime }: { blockTime: number }) => (
  <RawText color='gray.500' fontSize='sm' lineHeight='1'>
    {dayjs(blockTime * 1000).format('hh:mm A')}
  </RawText>
)
