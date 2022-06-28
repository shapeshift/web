import dayjs from 'dayjs'
import { RawText } from 'components/Text'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const TransactionDate = ({ blockTime }: { blockTime: number }) => {
  const selectedLocale = useAppSelector(selectSelectedLocale)

  const transactionDate = () => {
    require(`dayjs/locale/${selectedLocale}.js`)
    const localizedFormat = require('dayjs/plugin/localizedFormat')
    dayjs.extend(localizedFormat)

    return dayjs(blockTime * 1000)
      .locale(selectedLocale)
      .format('ll')
  }

  return (
    <RawText
      fontWeight='bold'
      fontSize='sm'
      color='gray.700'
      lineHeight='taller'
      whiteSpace='nowrap'
      px={4}
    >
      {transactionDate()}
    </RawText>
  )
}
