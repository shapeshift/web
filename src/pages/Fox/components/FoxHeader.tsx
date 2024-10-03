import { Container, Flex, Heading, Stack } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { Display } from 'components/Display'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { PageBackButton, PageHeader } from 'components/Layout/Header/PageHeader'
import { Text } from 'components/Text'
import { selectPortfolioAccountIdsByAssetIdFilter } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useFoxPageContext } from '../hooks/useFoxPageContext'

const containerPadding = { base: 6, '2xl': 8 }
const containerPaddingTop = { base: 0, md: 8 }

export const FoxHeader = () => {
  const translate = useTranslate()
  const { assetId, setAssetAccountId, selectedAssetAccountId } = useFoxPageContext()
  const accountIdsFilter = useMemo(() => ({ assetId }), [assetId])
  const accountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetIdFilter(state, accountIdsFilter),
  )

  const history = useHistory()

  const handleBack = useCallback(() => {
    history.push('/explore')
  }, [history])

  useEffect(() => {
    if (!accountIds.length) setAssetAccountId(undefined)
    if (accountIds.length === 1) {
      setAssetAccountId(accountIds[0])
    }
  }, [accountIds, setAssetAccountId])

  const activeAccountDropdown = useMemo(() => {
    if (accountIds.length <= 1) return null

    return (
      <InlineCopyButton
        isDisabled={!selectedAssetAccountId}
        value={selectedAssetAccountId ? fromAccountId(selectedAssetAccountId).account : ''}
      >
        <AccountDropdown
          defaultAccountId={selectedAssetAccountId}
          assetId={assetId}
          onChange={setAssetAccountId}
          // eslint-disable-next-line react-memo/require-usememo
          buttonProps={{ variant: 'solid', width: 'full' }}
        />
      </InlineCopyButton>
    )
  }, [accountIds.length, setAssetAccountId, selectedAssetAccountId, assetId])

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
      <Stack mb={4}>
        <Container maxWidth='container.4xl' px={containerPadding} pt={containerPaddingTop} pb={4}>
          <Display.Desktop>
            <Stack>
              <Flex alignItems='center' justifyContent='space-between'>
                <Heading>{translate('foxPage.title')}</Heading>
                {activeAccountDropdown}
              </Flex>
              <Text color='text.subtle' translation='foxPage.description' />
            </Stack>
          </Display.Desktop>
        </Container>
      </Stack>
    </>
  )
}
