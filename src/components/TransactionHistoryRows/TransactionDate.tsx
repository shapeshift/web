import dayjs from 'dayjs'
import { RawText } from 'components/Text'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const textPaddingX = { base: 2, md: 4 }

export const TransactionDate = ({ blockTime }: { blockTime: number }) => {
  const selectedLocale = useAppSelector(selectSelectedLocale)

  return (
    <RawText
      fontWeight='bold'
      fontSize='sm'
      color='text.subtle'
      lineHeight='taller'
      whiteSpace='nowrap'
      px={textPaddingX}
    >
      {dayjs(blockTime * 1000)
        .locale(selectedLocale)
        .format('LL')}
    </RawText>
  )
}
