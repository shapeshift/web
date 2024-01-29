import type { BoxProps } from '@chakra-ui/react'
import { Box, CircularProgressLabel, IconButton } from '@chakra-ui/react'
import { format as formatTime } from 'date-fns'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useCountdown } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/hooks/useCountdown'
import { GET_TRADE_QUOTE_POLLING_INTERVAL } from 'state/apis/swapper/swapperApi'

export const CountdownToggle = (boxProps: BoxProps) => {
  const translate = useTranslate()
  const { timeRemainingMs } = useCountdown({
    initialTimeMs: GET_TRADE_QUOTE_POLLING_INTERVAL,
    autoStart: true,
  })

  const icon = useMemo(
    () => (
      <CircularProgress
        size='6'
        value={GET_TRADE_QUOTE_POLLING_INTERVAL - timeRemainingMs}
        max={GET_TRADE_QUOTE_POLLING_INTERVAL}
        isIndeterminate={false}
      >
        <CircularProgressLabel fontSize={'8'}>
          {timeRemainingMs > 0 ? formatTime(timeRemainingMs, 's') : null}
        </CircularProgressLabel>
      </CircularProgress>
    ),
    [timeRemainingMs],
  )

  return (
    <Box width='auto' {...boxProps}>
      <IconButton
        aria-label={translate('trade.expand')}
        variant='link'
        borderTopRadius='none'
        colorScheme='blue'
        width='full'
        icon={icon}
      />
    </Box>
  )
}
