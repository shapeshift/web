import { Button, Flex } from '@chakra-ui/react'
import React, { useContext, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { EarnQueryParams } from 'context/EarnManagerProvider/EarnManagerProvider'
import { useQuery } from 'hooks/useQuery/useQuery'

export enum ManagerAction {
  Deposit = 'deposit',
  Withdraw = 'withdraw'
}

type EarnActionsContextProps = {
  action: ManagerAction
  onClick(action: ManagerAction): void
}

const EarnActionsContext = React.createContext<EarnActionsContextProps | null>(null)

export const useEarnActions = () => {
  const context = useContext(EarnActionsContext)
  if (!context) throw new Error("useEarnActions can't be used outside of a EarnActionsProvider")
  return context
}

export const EarnActionsProvider = ({ children }: { children: React.ReactNode }) => {
  const query = useQuery<EarnQueryParams>()
  const [action, setAction] = useState<ManagerAction>(query.action || ManagerAction.Deposit)
  return (
    <EarnActionsContext.Provider value={{ action, onClick: setAction }}>
      {children}
    </EarnActionsContext.Provider>
  )
}

export const EarnActionsButtons = () => {
  const translate = useTranslate()
  const { onClick } = useEarnActions()
  return (
    <Flex>
      <Button onClick={() => onClick(ManagerAction.Deposit)}>{translate('common.deposit')}</Button>
      <Button onClick={() => onClick(ManagerAction.Withdraw)}>
        {translate('common.withdraw')}
      </Button>
    </Flex>
  )
}
