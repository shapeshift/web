import { Checkbox } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { Account } from 'plugins/walletConnectToDapps/v2/components/Account'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import { selectPortfolioAccountsGroupedByNumberByChainId } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

interface IProps {
  chainId: ChainId
  toggleAccountId: (accountId: string) => void
  selectedAccountIds: string[]
}

export const AccountSelectionByChainId: FC<IProps> = ({
  chainId,
  selectedAccountIds,
  toggleAccountId,
}) => {
  const translate = useTranslate()
  const [allChecked, setAllChecked] = useState(false)
  const translateKey = (key: string) => `plugins.walletConnectToDapps.modal.sessionProposal.${key}`
  const filter = useMemo(() => ({ chainId }), [chainId])
  const accountIdsByAccountNumberChainId = useAppSelector(s =>
    selectPortfolioAccountsGroupedByNumberByChainId(s, filter),
  )
  const accountIds = Object.entries(accountIdsByAccountNumberChainId).flatMap(
    ([_, accountIds]) => accountIds,
  )
  const selectedAccountIdsByChainId = accountIds.filter(accountId =>
    selectedAccountIds.includes(accountId),
  )

  const renderAccounts = useMemo(() => {
    return Object.entries(accountIdsByAccountNumberChainId).map(([accountNumber, accountIds]) => {
      return accountIds.map(accountId => {
        const isSelected = selectedAccountIds.some(accountId => accountIds.includes(accountId))
        return (
          <Account
            accountId={accountId}
            accountNumber={accountNumber}
            isSelected={isSelected}
            toggleAccountId={toggleAccountId}
            key={accountNumber}
          ></Account>
        )
      })
    })
  }, [accountIdsByAccountNumberChainId, selectedAccountIds, toggleAccountId])

  const renderSelectedCounts = useMemo(() => {
    return `${selectedAccountIdsByChainId.length} / ${accountIds.length}`
  }, [accountIds.length, selectedAccountIdsByChainId.length])

  const handleSelectAllAccounts = useCallback(() => {
    const hasAllChecked = selectedAccountIdsByChainId.length === accountIds.length
    accountIds
      .filter(accountId => (hasAllChecked ? accountId : !selectedAccountIds.includes(accountId)))
      .map(accountId => toggleAccountId(accountId))
    setAllChecked(true)
  }, [accountIds, selectedAccountIds, selectedAccountIdsByChainId.length, toggleAccountId])

  useEffect(() => {
    // Update the select all when all options are selected
    if (selectedAccountIdsByChainId.length === accountIds.length) {
      setAllChecked(true)
    } else {
      setAllChecked(false)
    }
  }, [accountIds.length, selectedAccountIdsByChainId.length])

  return (
    <Row variant='gutter' flexDir='column' py={3} gap={2}>
      <Row alignItems='center'>
        <Row.Label>
          <Checkbox onChange={handleSelectAllAccounts} isChecked={allChecked}>
            {translate(translateKey('selectedAccounts'))}
          </Checkbox>
        </Row.Label>
        <Row.Value fontWeight='semibold' display='flex' gap={2} alignItems='center'>
          <RawText>{renderSelectedCounts}</RawText>
        </Row.Value>
      </Row>
      {renderAccounts}
    </Row>
  )
}
