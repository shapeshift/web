import { Container, Flex, Heading, HStack, Link, Stack } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useFoxPageContext } from '../hooks/useFoxPageContext'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Display } from '@/components/Display'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { Text } from '@/components/Text'
import { selectPortfolioAccountIdsByAssetIdFilter } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const containerPaddingTop = { base: 0, md: 8 }
const accountDropdownButtonProps = { variant: 'solid', width: 'full' }
const accountDropdownBoxProps = { px: 0, my: 0 }

export const FoxHeader = () => {
  const translate = useTranslate()
  const { assetId, setAssetAccountId, assetAccountId } = useFoxPageContext()
  const accountIdsFilter = useMemo(() => ({ assetId }), [assetId])
  const accountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetIdFilter(state, accountIdsFilter),
  )

  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    navigate('/explore')
  }, [navigate])

  const handleAnchorClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      event.preventDefault()
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', `#${id}`)
        }
      }
    },
    [],
  )

  const handleRfoxClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => handleAnchorClick(event, 'rfox'),
    [handleAnchorClick],
  )
  const handleFarmingClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => handleAnchorClick(event, 'farming'),
    [handleAnchorClick],
  )
  const handleGovernanceClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => handleAnchorClick(event, 'governance'),
    [handleAnchorClick],
  )
  const handleTokenClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => handleAnchorClick(event, 'token'),
    [handleAnchorClick],
  )

  const activeAccountDropdown = useMemo(() => {
    if (accountIds.length <= 1) return null

    return (
      <Flex alignItems='center' gap={2}>
        <Display.Desktop>
          <Text translation='common.activeAccount' fontWeight='medium' />
        </Display.Desktop>
        <InlineCopyButton
          isDisabled={!assetAccountId}
          value={assetAccountId ? fromAccountId(assetAccountId).account : ''}
        >
          <AccountDropdown
            defaultAccountId={assetAccountId}
            assetId={assetId}
            onChange={setAssetAccountId}
            buttonProps={accountDropdownButtonProps}
            boxProps={accountDropdownBoxProps}
          />
        </InlineCopyButton>
      </Flex>
    )
  }, [accountIds.length, setAssetAccountId, assetAccountId, assetId])

  return (
    <>
      <Display.Mobile>
        <PageHeader>
          <PageHeader.Left>
            <PageBackButton onBack={handleBack} />
          </PageHeader.Left>
          <PageHeader.Middle>
            <PageHeader.Title>{translate('foxPage.title')}</PageHeader.Title>
          </PageHeader.Middle>
        </PageHeader>
      </Display.Mobile>
      <Display.Mobile>
        <Flex px={4} py={2}>
          {activeAccountDropdown}
        </Flex>
      </Display.Mobile>
      <Display.Desktop>
        <Stack mb={4}>
          <Container pt={containerPaddingTop} pb={4}>
            <Stack>
              <Flex alignItems='center' justifyContent='space-between'>
                <Heading>{translate('foxPage.title')}</Heading>
                {activeAccountDropdown}
              </Flex>
              <Text color='text.subtle' translation='foxPage.description' />
              <HStack gap={4} mt={6}>
                <Link href='#rfox' color='text.link' onClick={handleRfoxClick}>
                  {translate('RFOX.staking')}
                </Link>
                <Link href='#token' color='text.link' onClick={handleTokenClick}>
                  {translate('foxPage.foxToken')}
                </Link>
                <Link href='#farming' color='text.link' onClick={handleFarmingClick}>
                  {translate('foxPage.foxFarming.title')}
                </Link>
                <Link href='#governance' color='text.link' onClick={handleGovernanceClick}>
                  {translate('foxPage.governance.title')}
                </Link>
              </HStack>
            </Stack>
          </Container>
        </Stack>
      </Display.Desktop>
    </>
  )
}
