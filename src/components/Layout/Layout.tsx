import type { ContainerProps } from '@chakra-ui/react'
import { Alert, AlertDescription, AlertIcon, AlertTitle, Container, Flex } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import {
  selectAssets,
  selectPortfolioLoadingStatus,
  selectPortfolioLoadingStatusGranular,
} from 'state/slices/selectors'

import { Header } from './Header/Header'
import { SideNav } from './Header/SideNav'

const DegradedStateBanner = () => {
  const translate = useTranslate()
  const assets = useSelector(selectAssets)
  const portfolioLoadingStatusGranular = useSelector(selectPortfolioLoadingStatusGranular)

  const erroredAccountNames = Array.from(
    new Set(
      Object.entries(portfolioLoadingStatusGranular)
        .filter(([, accountState]) => accountState === 'error')
        .map(([accountId]) => assets[accountIdToFeeAssetId(accountId)].name),
    ),
  ).join(', ')

  return (
    <Alert status='warning' mx={4} mt={4} width='auto' flexDirection={'column'}>
      <AlertIcon />
      <AlertTitle>{translate('common.degradedState')}</AlertTitle>
      <AlertDescription>
        {translate('common.degradedInfo', { erroredAccountNames })}
      </AlertDescription>
    </Alert>
  )
}

export const Layout: React.FC<ContainerProps> = ({ children, ...rest }) => {
  const portfolioLoadingStatus = useSelector(selectPortfolioLoadingStatus)
  const isDegradedState = portfolioLoadingStatus === 'error'
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
