import type { ContainerProps } from '@chakra-ui/react'
import { Alert, AlertDescription, AlertIcon, Button, Container, Flex } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { entries, isEmpty, uniq } from 'lodash'
import React, { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import {
  selectAssets,
  selectPortfolioLoadingStatus,
  selectPortfolioLoadingStatusGranular,
} from 'state/slices/selectors'
import { useAppDispatch } from 'state/store'

import { Header } from './Header/Header'
import { SideNav } from './Header/SideNav'

const DegradedStateBanner = () => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const portfolioLoadingStatusGranular = useSelector(selectPortfolioLoadingStatusGranular)
  const assets = useSelector(selectAssets)

  const erroredAccountIds = useMemo(() => {
    return entries(portfolioLoadingStatusGranular).reduce<AccountId[]>(
      (acc, [accountId, accountState]) => {
        accountState === 'error' && acc.push(accountId)
        return acc
      },
      [],
    )
  }, [portfolioLoadingStatusGranular])

  const erroredAccountNames = useMemo(() => {
    if (isEmpty(assets)) return
    if (!erroredAccountIds.length) return // yay
    // we can have multiple accounts with the same name, dont show 'Bitcoin, Bitcoin, Bitcoin'
    return uniq(
      erroredAccountIds.map(
        (accountId: AccountId) => assets[accountIdToFeeAssetId(accountId ?? '') ?? '']?.name ?? '',
      ),
    ).join(', ')
  }, [assets, erroredAccountIds])

  const handleRetry = useCallback(() => {
    erroredAccountIds.forEach(accountId =>
      dispatch(
        portfolioApi.endpoints.getAccount.initiate(
          { accountId, upsertOnFetch: true },
          { forceRefetch: true },
        ),
      ),
    )
  }, [dispatch, erroredAccountIds])

  return (
    <Alert
      status='warning'
      mx={4}
      mt={4}
      width='auto'
      flexDirection={{ base: 'column', lg: 'row' }}
    >
      <AlertIcon />
      <AlertDescription textAlign={{ base: 'center', lg: 'left' }}>
        {translate('common.accountError', { erroredAccountNames })}
      </AlertDescription>
      <Button
        variant='ghost'
        colorScheme='yellow'
        onClick={handleRetry}
        size='sm'
        ml={{ base: 0, lg: 'auto' }}
        mt={{ base: 4, lg: 0 }}
      >
        {translate('errorPage.cta')}
      </Button>
    </Alert>
  )
}

export const Layout: React.FC<ContainerProps> = ({ children, ...rest }) => {
  const isDegradedState = useSelector(selectPortfolioLoadingStatus) === 'error'
  return (
    <>
      <Header />

      <Flex maxWidth='container.3xl' margin='0 auto'>
        <SideNav />
        <Container
          as='main'
          maxWidth='full'
          width='full'
          paddingBottom={{ base: 'calc(0 + env(safe-area-inset-bottom))', md: 0 }}
          marginInline='auto'
          paddingInlineStart='0'
          paddingInlineEnd='0'
          flex='1 1 0%'
          {...rest}
        >
          <>
            {isDegradedState && <DegradedStateBanner />}
            {children}
          </>
        </Container>
      </Flex>
    </>
  )
}
