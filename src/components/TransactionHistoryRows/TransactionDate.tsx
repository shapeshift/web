import dayjs from 'dayjs'
import { RawText } from 'components/Text'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const TransactionDate = ({ blockTime }: { blockTime: number }) => {
  const selectedLocale = useAppSelector(selectSelectedLocale)

  return (
    <RawText
      fontWeight='bold'
      fontSize='sm'
      color='gray.700'
      lineHeight='taller'
      whiteSpace='nowrap'
      px={{ base: 2, md: 4 }}
    >
      {dayjs(blockTime * 1000)
        .locale(selectedLocale)
        .format('ll')}
    </RawText>
  )
}
