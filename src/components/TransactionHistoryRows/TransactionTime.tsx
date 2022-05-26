import dayjs from 'dayjs'
import { RawText } from 'components/Text'

type TransactionTimeProps = {
  blockTime: number
  format?: string
}

export const TransactionTime = ({ blockTime, format = 'hh:mm A' }: TransactionTimeProps) => (
  <RawText color='gray.500' fontSize='sm'>
    {dayjs(blockTime * 1000).format(format)}
  </RawText>
)
