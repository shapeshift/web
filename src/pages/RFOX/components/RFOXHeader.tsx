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
  const { stakingAssetId, setStakingAssetAccountId, stakingAssetAccountId } = useRFOXContext()

  const accountIdsFilter = useMemo(() => ({ assetId: stakingAssetId }), [stakingAssetId])
  const accountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetIdFilter(state, accountIdsFilter),
  )

  const activeAccountDropdown = useMemo(() => {
    // Side-effect is useMemo isn't a mistake - reactivity is borked if trying to do an `useEffect` instead, see
    // https://github.com/shapeshift/web/pull/7509#issuecomment-2297664261
    if (accountIds.length === 1) {
      setStakingAssetAccountId(accountIds[0])
      return null
    }
    if (!(accountIds.length > 1)) return null
    return (
      <Flex alignItems='center' gap={2}>
        <Text translation='common.activeAccount' fontWeight='medium' />

        <AccountDropdown
          defaultAccountId={stakingAssetAccountId}
          assetId={stakingAssetId}
          onChange={setStakingAssetAccountId}
          // dis already memoized
          // eslint-disable-next-line react-memo/require-usememo
          buttonProps={{ variant: 'solid', width: 'full' }}
          showLabel={false}
        />
      </Flex>
    )
    // We *do* want accountIds.length as an explicit dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    accountIds.length,
    accountIds,
    setStakingAssetAccountId,
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
