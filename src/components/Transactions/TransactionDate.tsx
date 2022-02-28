import dayjs from 'dayjs'
import { RawText } from 'components/Text'

export const TransactionDate = ({ blockTime }: { blockTime: number }) => (
  <RawText fontWeight='bold' lineHeight='1' mb={6}>
    {dayjs(blockTime * 1000).format('MMMM DD, YYYY')}
  </RawText>
)
