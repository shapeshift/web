import { RawText } from 'components/Text'
import { useDate } from 'hooks/useDate/useDate'

type TransactionTimeProps = {
  blockTime: number
  format?: string
}

export const TransactionTime = ({ blockTime, format = 'hh:mm A' }: TransactionTimeProps) => {
  const displayDate = useDate()

  return (
    <RawText color='gray.500' fontSize='sm'>
      {displayDate(blockTime * 1000, format)}
    </RawText>
  )
}
