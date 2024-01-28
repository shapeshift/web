import { ChevronUpIcon } from '@chakra-ui/icons'
import type { BoxProps } from '@chakra-ui/react'
import { Box, CircularProgressLabel, IconButton } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useCountdown } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/hooks/useCountdown'
import { GET_TRADE_QUOTE_POLLING_INTERVAL } from 'state/apis/swapper/swapperApi'

export type CountdownToggleProps = {
  isOpen: boolean
  showToggle: boolean
  onToggle: () => void
} & BoxProps

export const CountdownToggle = ({
  isOpen,
  onToggle,
  showToggle,
  ...boxProps
}: CountdownToggleProps) => {
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
        {showToggle && (
          <CircularProgressLabel>
            <ChevronUpIcon
              transform={isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
              transition='transform 0.2s ease-in-out'
              boxSize='16px'
            />
          </CircularProgressLabel>
        )}
      </CircularProgress>
    ),
    [isOpen, showToggle, timeRemainingMs],
  )

  return (
    <Box width='auto' {...boxProps}>
      <IconButton
        aria-label={translate('trade.expand')}
        variant='link'
        borderTopRadius='none'
        colorScheme='blue'
        onClick={onToggle}
        width='full'
        icon={icon}
      />
    </Box>
  )
}
