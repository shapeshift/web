import { ButtonGroupProps } from '@chakra-ui/button'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { Radio } from 'components/Radio/Radio'

type TimeControlsProps = {
  onChange: (arg: HistoryTimeframe) => void
  defaultTime: HistoryTimeframe
  buttonGroupProps?: ButtonGroupProps
}

export const TimeControls = ({ onChange, defaultTime, buttonGroupProps }: TimeControlsProps) => {
  const options = [
    { value: HistoryTimeframe.HOUR, label: 'graph.timeControls.1H' },
    { value: HistoryTimeframe.DAY, label: 'graph.timeControls.24H' },
    { value: HistoryTimeframe.WEEK, label: 'graph.timeControls.1W' },
    { value: HistoryTimeframe.MONTH, label: 'graph.timeControls.1M' }
    // { value: HistoryTimeframe.YEAR, label: 'graph.timeControls.1Y' },
    // { value: HistoryTimeframe.ALL, label: 'graph.timeControls.all' }
  ]
  return (
    <Radio
      options={options}
      defaultValue={defaultTime}
      onChange={onChange}
      buttonGroupProps={buttonGroupProps}
    />
  )
}
