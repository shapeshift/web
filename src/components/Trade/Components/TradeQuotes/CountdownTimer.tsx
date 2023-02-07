import { Tooltip } from '@chakra-ui/react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'

import { useCountdown } from './useCountDown'

type CountDownTimerProps = {
  time: number
}

export const CountDownTimer: React.FC<CountDownTimerProps> = ({ time = 1 }) => {
  const { progress, seconds } = useCountdown(time)
  return (
    <Tooltip label={`something great in ${seconds} seconds`}>
      <span>
        <CircularProgress isIndeterminate={false} value={progress} size='16px' thickness='14px' />
      </span>
    </Tooltip>
  )
}
