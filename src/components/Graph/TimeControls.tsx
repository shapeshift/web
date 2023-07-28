import type { ButtonGroupProps } from '@chakra-ui/react'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { memo } from 'react'
import { Radio } from 'components/Radio/Radio'

type TimeControlsProps = {
  onChange: (arg: HistoryTimeframe) => void
  defaultTime: HistoryTimeframe
  buttonGroupProps?: ButtonGroupProps
}

export const TimeControls = memo(
  ({ onChange, defaultTime, buttonGroupProps }: TimeControlsProps) => {
    const options = Object.freeze([
      { value: HistoryTimeframe.HOUR, label: 'graph.timeControls.1H' },
      { value: HistoryTimeframe.DAY, label: 'graph.timeControls.24H' },
      { value: HistoryTimeframe.WEEK, label: 'graph.timeControls.1W' },
      { value: HistoryTimeframe.MONTH, label: 'graph.timeControls.1M' },
      { value: HistoryTimeframe.YEAR, label: 'graph.timeControls.1Y' },
      { value: HistoryTimeframe.ALL, label: 'graph.timeControls.all' },
    ])
    return (
      <Radio
        options={options}
        defaultValue={defaultTime}
        onChange={onChange}
        buttonGroupProps={buttonGroupProps}
      />
    )
  },
)
