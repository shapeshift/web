import { ModalBody } from '@chakra-ui/react'
import {
  ManagerActions,
  useEarnActions
} from 'context/EarnManagerProvider/context/EarnActions/EarnActionsProvider'
import { YearnDeposit } from 'context/EarnManagerProvider/providers/yearn/components/YearnManager/YearnDeposit'

import { YearnWithdraw } from './YearnWithdraw'

export const YearnManager = () => {
  const { action } = useEarnActions()
  return (
    <ModalBody>
      {action === ManagerActions.Deposit ? <YearnDeposit /> : <YearnWithdraw />}
    </ModalBody>
  )
}
