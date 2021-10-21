import { marketService } from '@shapeshiftoss/types'
import { Radio } from 'components/Radio/Radio'

type TimeControlsProps = {
  onChange: (arg: marketService.HistoryTimeframe) => void
  defaultTime: marketService.HistoryTimeframe
}

export const TimeControls = ({ onChange, defaultTime }: TimeControlsProps) => {
  const options = [
    { value: marketService.HistoryTimeframe.HOUR, label: 'graph.timeControls.1H' },
    { value: marketService.HistoryTimeframe.DAY, label: 'graph.timeControls.24H' },
    { value: marketService.HistoryTimeframe.WEEK, label: 'graph.timeControls.1W' },
    { value: marketService.HistoryTimeframe.MONTH, label: 'graph.timeControls.1M' },
    { value: marketService.HistoryTimeframe.YEAR, label: 'graph.timeControls.1Y' },
    { value: marketService.HistoryTimeframe.ALL, label: 'graph.timeControls.all' }
  ]
  return <Radio options={options} defaultValue={defaultTime} onChange={onChange} />
}
