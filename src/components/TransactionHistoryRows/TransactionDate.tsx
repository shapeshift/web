import dayjs from 'dayjs'
import { RawText } from 'components/Text'

export const TransactionDate = ({ blockTime }: { blockTime: number }) => (
  <RawText
    fontWeight='bold'
    fontSize='sm'
    color='gray.700'
    lineHeight='taller'
    whiteSpace='nowrap'
    px={4}
  >
    {dayjs(blockTime * 1000).format('MMMM DD, YYYY')}
  </RawText>
)
