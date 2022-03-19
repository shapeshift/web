import { Input } from '@chakra-ui/react'
import { selectBalanceThreshold } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const BalanceThresholdInput = () => {
  const balanceThreshold = useAppSelector(selectBalanceThreshold)
  return <Input type='number' defaultValue={balanceThreshold} />
}
