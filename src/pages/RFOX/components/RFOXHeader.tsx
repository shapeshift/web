import { Flex, Heading } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { arbitrumChainId, fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useRFOXContext } from '../hooks/useRfoxContext'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Display } from '@/components/Display'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { SEO } from '@/components/Layout/Seo'
import { Text } from '@/components/Text'
import { selectAccountIdsByChainIdFilter } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

const buttonProps = { variant: 'solid', width: 'full' }

export const RFOXHeader = () => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const {
    stakingAssetId,
    selectedAssetAccountId,
    stakingAssetAccountId,
    setStakingAssetAccountId,
  } = useRFOXContext()

  const handleBack = useCallback(() => {
    navigate('/explore')
  }, [navigate])

  const accountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: arbitrumChainId }),
  )

  useEffect(() => {
    if (!accountIds.length) setStakingAssetAccountId(undefined)
    if (accountIds.length === 1) setStakingAssetAccountId(accountIds[0])
  }, [accountIds, setStakingAssetAccountId])

  const handleChange = useCallback(
    (accountId: AccountId) => {
      const { account } = fromAccountId(accountId)
      setStakingAssetAccountId(toAccountId({ chainId: arbitrumChainId, account }))
    },
    [setStakingAssetAccountId],
  )

  const activeAccountDropdown = useMemo(() => {
    if (accountIds.length <= 1) return null

    return (
      <Flex alignItems='center' gap={2}>
        <Text translation='common.activeAccount' fontWeight='medium' />

        <InlineCopyButton
          isDisabled={!stakingAssetAccountId}
          value={stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : ''}
        >
          <AccountDropdown
            defaultAccountId={selectedAssetAccountId}
            assetId={stakingAssetId}
            onChange={handleChange}
            buttonProps={buttonProps}
          />
        </InlineCopyButton>
      </Flex>
    )
  }, [
    accountIds.length,
    handleChange,
    selectedAssetAccountId,
    stakingAssetAccountId,
    stakingAssetId,
  ])

  return (
    <>
      <PageHeader>
        <SEO title={translate('RFOX.staking')} />
        <Display.Mobile>
          <PageHeader.Left>
            <PageBackButton onBack={handleBack} />
          </PageHeader.Left>
          <PageHeader.Middle>
            <PageHeader.Title>{translate('RFOX.staking')}</PageHeader.Title>
          </PageHeader.Middle>
        </Display.Mobile>
        <Display.Desktop>
          <PageHeader.Left>
            <Heading mb={4}>{translate('RFOX.staking')}</Heading>
          </PageHeader.Left>
          <PageHeader.Right>{activeAccountDropdown}</PageHeader.Right>
        </Display.Desktop>
      </PageHeader>
      <Display.Mobile>{activeAccountDropdown}</Display.Mobile>
    </>
  )
}
