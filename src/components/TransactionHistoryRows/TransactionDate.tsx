import type { TextProps } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { RawText } from 'components/Text'
import { selectSelectedLocale } from 'state/selectors'
import { useAppSelector } from 'state/store'

export const TransactionDate = ({ blockTime, ...rest }: { blockTime: number } & TextProps) => {
  const selectedLocale = useAppSelector(selectSelectedLocale)

  return (
    <RawText {...rest}>
      {dayjs(blockTime * 1000)
        .locale(selectedLocale)
        .format('LL')}
    </RawText>
  )
}
