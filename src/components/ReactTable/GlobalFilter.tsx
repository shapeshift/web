import { Input } from '@chakra-ui/react'
import { debounce } from 'lodash'
import { useCallback, useMemo, useState } from 'react'

type GlobalFilterProps = {
  setGlobalFilter: (filterValue: any) => void
  globalFilter: any
}
export const GlobalFilter: React.FC<GlobalFilterProps> = ({ setGlobalFilter, globalFilter }) => {
  const [value, setValue] = useState(globalFilter)

  const handleDebounce = useCallback(
    (value: string) => {
      setGlobalFilter(value)
    },
    [setGlobalFilter],
  )
  const debounceFnc = useMemo(() => debounce(handleDebounce, 1000), [handleDebounce])

  const handleChange = (value: string) => {
    setValue(value)
    debounceFnc(value)
  }
  return (
    <Input
      variant='filled'
      placeholder='Search'
      onChange={e => handleChange(e.target.value)}
      value={value}
    />
  )
}
