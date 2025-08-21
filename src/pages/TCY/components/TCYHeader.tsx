import { Flex, Heading } from '@chakra-ui/react'
import { fromAccountId, thorchainAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { CurrentAccount } from '../tcy'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Display } from '@/components/Display'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { SEO } from '@/components/Layout/Seo'
import { Text } from '@/components/Text'
import {
  selectAccountIdsByChainIdFilter,
  selectAccountNumberByAccountId,
} from '@/state/slices/portfolioSlice/selectors'
import { store, useAppSelector } from '@/state/store'

const buttonProps = {
  variant: 'solid',
  width: 'full',
}

type TCYHeaderProps = {
  currentAccount: CurrentAccount
  onAccountNumberChange: (accountNumber: number) => void
}

export const TCYHeader = ({ currentAccount, onAccountNumberChange }: TCYHeaderProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    navigate('/explore')
  }, [navigate])

  const accountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: thorchainChainId }),
  )

  const currentAccountId = currentAccount.accountId

  const handleChange = useCallback(
    (accountId: string) => {
      const accountNumber = selectAccountNumberByAccountId(store.getState(), { accountId })
      if (accountNumber === undefined) throw new Error('Account number not found')
      onAccountNumberChange(accountNumber)
    },
    [onAccountNumberChange],
  )

  const activeAccountDropdown = useMemo(() => {
    if (accountIds.length <= 1) return null

    return (
      <Flex alignItems='center' gap={2}>
        <Text translation='common.activeAccount' fontWeight='medium' />

        {currentAccountId && <InlineCopyButton value={fromAccountId(currentAccountId).account} />}
        <AccountDropdown
          defaultAccountId={currentAccountId}
          assetId={thorchainAssetId}
          onChange={handleChange}
          buttonProps={buttonProps}
        />
      </Flex>
    )
  }, [accountIds, handleChange, currentAccountId])

  return (
    <>
      <PageHeader>
        <SEO title={translate('TCY.staking')} />
        <Display.Mobile>
          <PageHeader.Left>
            <PageBackButton onBack={handleBack} />
          </PageHeader.Left>
          <PageHeader.Middle>
            <PageHeader.Title>{translate('TCY.staking')}</PageHeader.Title>
          </PageHeader.Middle>
        </Display.Mobile>
        <Display.Desktop>
          <PageHeader.Left>
            <Heading mb={4}>{translate('TCY.staking')}</Heading>
          </PageHeader.Left>
          <PageHeader.Right>{activeAccountDropdown}</PageHeader.Right>
        </Display.Desktop>
      </PageHeader>
      <Display.Mobile>{activeAccountDropdown}</Display.Mobile>
    </>
  )
}
