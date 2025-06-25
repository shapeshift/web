import { useMediaQuery } from '@chakra-ui/react'

import { SettingsPopover } from '../../SettingsPopover'
import { QuoteTimer } from './QuoteTimer'

import { selectActiveQuote } from '@/state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

type TradeSettingsMenuProps = {
  isCompact: boolean | undefined
}

export const TradeSettingsMenu = ({ isCompact }: TradeSettingsMenuProps) => {
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })
  const activeQuote = useAppSelector(selectActiveQuote)

  return (
    <>
      {activeQuote && (isCompact || isSmallerThanXl) && <QuoteTimer />}
      <SettingsPopover />
    </>
  )
}
