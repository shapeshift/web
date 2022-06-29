import { RawText } from 'components/Text'
import { useDate } from 'hooks/useDate/useDate'

export const TransactionDate = ({ blockTime }: { blockTime: number }) => {
  const displayDate = useDate()

  return (
    <RawText
      fontWeight='bold'
      fontSize='sm'
      color='gray.700'
      lineHeight='taller'
      whiteSpace='nowrap'
      px={4}
    >
      {displayDate(blockTime * 1000, 'll')}
    </RawText>
  )
}
