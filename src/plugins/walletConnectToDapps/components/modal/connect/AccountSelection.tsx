import { List, ModalHeader } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { selectPortfolioAccountsGroupedByNumberByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountButton } from './AccountButton'
import { ConnectRoutes } from './ConnectCommon'

export const AccountSelection = ({
  handleAccountChange,
}: {
  handleAccountChange: (account: AccountId) => void
}) => {
  const history = useHistory()
  const translate = useTranslate()
  const accountIdsByAccountNumber = useAppSelector(s =>
    selectPortfolioAccountsGroupedByNumberByChainId(s, { chainId: ethChainId }),
  )
  const accountRows = useMemo(() => {
    return Object.entries(accountIdsByAccountNumber).map(([accountNumber, accountIds]) => (
      <AccountButton
        key={accountNumber}
        accountNumber={Number(accountNumber)}
        accountIds={accountIds}
        onClick={() => {
          handleAccountChange(accountIds[0])
          history.push(ConnectRoutes.Index)
        }}
      />
    ))
  }, [accountIdsByAccountNumber, handleAccountChange, history])
  return (
    <SlideTransition>
      <ModalHeader textAlign='center' userSelect='none'>
        {translate('accounts.selectAccount')}
      </ModalHeader>
      <List>{accountRows}</List>
    </SlideTransition>
  )
}
