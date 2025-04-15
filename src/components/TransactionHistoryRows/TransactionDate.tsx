import type { TextProps } from '@chakra-ui/react'
import dayjs from 'dayjs'

import { RawText } from '@/components/Text'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppSelector } from '@/state/store'

export const TransactionDate = ({ blockTime, ...rest }: { blockTime: number } & TextProps) => {
  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)

  return (
    <RawText {...rest}>
      {dayjs(blockTime * 1000)
        .locale(selectedLocale)
        .format('LL')}
    </RawText>
  )
}
