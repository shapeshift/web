import { Button, Flex } from '@chakra-ui/react'
import React, { useContext, useState } from 'react'
import { useQuery } from 'hooks/useQuery/useQuery'

export enum ManagerActions {
  Deposit = 'deposit',
  Withdraw = 'withdraw'
}

type EarnActionsContextProps = {
  action: ManagerActions
  onClick(action: ManagerActions): void
}

const EarnActionsContext = React.createContext<EarnActionsContextProps | null>(null)

export const useEarnActions = () => {
  const context = useContext(EarnActionsContext)
  if (!context) throw new Error("useEarnActions can't be used outside of a EarnActionsProvider")
  return context
}

export const EarnActionsProvider = ({ children }: { children: React.ReactNode }) => {
  const query = useQuery()
  const [action, setAction] = useState<ManagerActions>(
    (query.action as ManagerActions) || ManagerActions.Deposit
  )
  return (
    <EarnActionsContext.Provider value={{ action, onClick: setAction }}>
      {children}
    </EarnActionsContext.Provider>
  )
}

export const EarnActionsButtons = () => {
  const { onClick } = useEarnActions()
  return (
    <Flex>
      <Button onClick={() => onClick(ManagerActions.Deposit)}>Deposit</Button>
      <Button onClick={() => onClick(ManagerActions.Withdraw)}>Withdraw</Button>
    </Flex>
  )
}
