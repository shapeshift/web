import { Flex, Heading } from '@chakra-ui/react'
import { arbitrumChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Display } from '@/components/Display'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { SEO } from '@/components/Layout/Seo'
import { Text } from '@/components/Text'
import { selectAccountIdsByChainIdFilter } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

export const TCYHeader = () => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    navigate('/explore')
  }, [navigate])

  const accountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: arbitrumChainId }),
  )

  const handleChange = useCallback(() => {}, [])

  const activeAccountDropdown = useMemo(() => {
    if (accountIds.length <= 1) return null

    return (
      <Flex alignItems='center' gap={2}>
        <Text translation='common.activeAccount' fontWeight='medium' />

        <InlineCopyButton value={''} />
        <AccountDropdown
          defaultAccountId={''}
          assetId={''}
          onChange={handleChange}
          // dis already memoized
          // eslint-disable-next-line react-memo/require-usememo
          buttonProps={{ variant: 'solid', width: 'full' }}
        />
      </Flex>
    )
  }, [accountIds.length, handleChange])

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
