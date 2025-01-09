import { Flex, Heading } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { Display } from 'components/Display'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { PageBackButton, PageHeader } from 'components/Layout/Header/PageHeader'
import { SEO } from 'components/Layout/Seo'
import { Text } from 'components/Text'
import { selectPortfolioAccountIdsByAssetIdFilter } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

import { useRFOXContext } from '../hooks/useRfoxContext'

// TODO: Handle multi account detection across staking assets

export const RFOXHeader = () => {
  const translate = useTranslate()
  const history = useHistory()
  const { stakingAssetId, stakingAssetAccountId, setStakingAssetAccountId } = useRFOXContext()

  const handleBack = useCallback(() => {
    history.push('/explore')
  }, [history])

  const accountIdsFilter = useMemo(() => ({ assetId: stakingAssetId }), [stakingAssetId])
  const accountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetIdFilter(state, accountIdsFilter),
  )

  useEffect(() => {
    if (!accountIds.length) setStakingAssetAccountId(undefined)
    if (accountIds.length === 1) setStakingAssetAccountId(accountIds[0])
  }, [accountIds, setStakingAssetAccountId])

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
            defaultAccountId={stakingAssetAccountId}
            assetId={stakingAssetId}
            onChange={setStakingAssetAccountId}
            // dis already memoized
            // eslint-disable-next-line react-memo/require-usememo
            buttonProps={{ variant: 'solid', width: 'full' }}
          />
        </InlineCopyButton>
      </Flex>
    )
  }, [accountIds.length, setStakingAssetAccountId, stakingAssetAccountId, stakingAssetId])

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
