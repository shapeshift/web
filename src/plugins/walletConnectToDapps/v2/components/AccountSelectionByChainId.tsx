import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Collapse, useColorModeValue, useDisclosure } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { Account } from 'plugins/walletConnectToDapps/v2/components/Account'
import type { FC } from 'react'
import { useMemo } from 'react'
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
  const { isOpen, onToggle } = useDisclosure()
  const hoverBg = useColorModeValue('blackAlpha.100', 'whiteAlpha.50')
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
  return (
    <Row
      variant='gutter'
      flexDir='column'
      cursor='pointer'
      _hover={{ bg: hoverBg }}
      py={3}
      gap={2}
      onClick={onToggle}
    >
      <Row alignItems='center'>
        <Row.Label>{translate(translateKey('selectedAccounts'))}</Row.Label>
        <Row.Value fontWeight='semibold' display='flex' gap={2} alignItems='center'>
          <RawText>{renderSelectedCounts}</RawText>
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon boxSize={4} />}
        </Row.Value>
      </Row>
      <Collapse in={isOpen}>{renderAccounts}</Collapse>
    </Row>
  )
}
