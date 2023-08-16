import dayjs from 'dayjs'
import { RawText } from 'components/Text'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type TransactionTimeProps = {
  blockTime: number
  format?: string
}

export const TransactionTime = ({ blockTime, format = 'LT' }: TransactionTimeProps) => {
  const selectedLocale = useAppSelector(selectSelectedLocale)

  return (
    <RawText color='text.subtle' fontSize='sm'>
      {dayjs(blockTime * 1000)
        .locale(selectedLocale)
        .format(format)}
    </RawText>
  )
}
