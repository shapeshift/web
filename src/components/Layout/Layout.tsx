import type { ContainerProps } from '@chakra-ui/react'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  Container,
  Flex,
} from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import {
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
  const handleRetry = useCallback(() => {
    Object.entries(portfolioLoadingStatusGranular)
      .filter(([, accountState]) => accountState === 'error', [])
      .forEach(([accountId]) => {
        dispatch(portfolioApi.endpoints.getAccount.initiate(accountId, { forceRefetch: true }))
      })
  }, [dispatch, portfolioLoadingStatusGranular])

  return (
    <Alert
      status='warning'
      mx={4}
      mt={4}
      width='auto'
      flexDirection={{ base: 'column', lg: 'row' }}
    >
      <AlertIcon />
      <AlertTitle>{translate('common.degradedState')}</AlertTitle>
      <AlertDescription textAlign={{ base: 'center', lg: 'left' }}>
        {translate('common.degradedInfo')}
        <Button ml={1} variant='link' onClick={handleRetry}>
          {translate('common.retryQuestion')}
        </Button>
      </AlertDescription>
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
