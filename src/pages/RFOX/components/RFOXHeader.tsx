import { Flex, Heading, Stack } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { Display } from 'components/Display'
import { PageBackButton, PageHeader } from 'components/Layout/Header/PageHeader'
import { SEO } from 'components/Layout/Seo'
import { Text } from 'components/Text'
import { selectPortfolioAccountIdsByAssetIdFilter } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useRFOXContext } from '../hooks/useRfoxContext'

export const RFOXHeader = () => {
  const translate = useTranslate()
  const history = useHistory()
  const handleBack = useCallback(() => {
    history.push('/explore')
  }, [history])
  const { stakingAssetId, setSelectedAssetAccountId, stakingAssetAccountId } = useRFOXContext()

  const accountIdsFilter = useMemo(() => ({ assetId: stakingAssetId }), [stakingAssetId])
  const accountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetIdFilter(state, accountIdsFilter),
  )
  const activeAccountDropdown = useMemo(() => {
    if (!(accountIds.length > 1)) return null
    return (
      <Flex alignItems='center' gap={2}>
        <Text translation='common.activeAccount' fontWeight='medium' />

        <AccountDropdown
          defaultAccountId={stakingAssetAccountId}
          assetId={stakingAssetId}
          onChange={setSelectedAssetAccountId}
          // dis already memoized
          // eslint-disable-next-line react-memo/require-usememo
          buttonProps={{ variant: 'solid', width: 'full' }}
          showLabel={false}
        />
      </Flex>
    )
  }, [accountIds.length, setSelectedAssetAccountId, stakingAssetAccountId, stakingAssetId])

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
            <Stack pb={4}>
              <Heading>{translate('RFOX.staking')}</Heading>
              <Text translation='explore.rfox.body' color='text.subtle' />
            </Stack>
          </PageHeader.Left>
          <PageHeader.Right>{activeAccountDropdown}</PageHeader.Right>
        </Display.Desktop>
      </PageHeader>
      <Display.Mobile>{activeAccountDropdown}</Display.Mobile>
    </>
  )
}
