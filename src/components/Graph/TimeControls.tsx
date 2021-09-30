import { HistoryTimeframe } from '@shapeshiftoss/types'
import { Radio } from 'components/Radio/Radio'

type TimeControlsProps = {
  onChange: (arg: HistoryTimeframe) => void
  defaultTime: HistoryTimeframe
}

export const TimeControls = ({ onChange, defaultTime }: TimeControlsProps) => {
  const options = [
    { value: HistoryTimeframe.HOUR, label: 'graph.timeControls.1H' },
    { value: HistoryTimeframe.DAY, label: 'graph.timeControls.24H' },
    { value: HistoryTimeframe.WEEK, label: 'graph.timeControls.1W' },
    { value: HistoryTimeframe.MONTH, label: 'graph.timeControls.1M' },
    { value: HistoryTimeframe.YEAR, label: 'graph.timeControls.1Y' },
    { value: HistoryTimeframe.ALL, label: 'graph.timeControls.all' }
  ]
  return <Radio options={options} defaultValue={defaultTime} onChange={onChange} />
}
