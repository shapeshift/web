import { Card, CardBody, Container, Flex, Heading, Skeleton, Stack } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { Display } from '@/components/Display'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import type { TabItem } from '@/components/TabMenu/TabMenu'
import { TabMenu } from '@/components/TabMenu/TabMenu'
import { Text } from '@/components/Text'
import { useChainflipLendingPools } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'

const responsiveFlex = { base: 'auto', lg: 1 }
const containerPaddingTop = { base: 0, md: 8 }

export const ChainflipLendingHeader = () => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const navItems: TabItem[] = useMemo(
    () => [
      {
        label: 'chainflipLending.overview',
        path: '/chainflip-lending',
        color: 'blue',
        exact: true,
      },
      {
        label: 'chainflipLending.supply',
        path: '/chainflip-lending/supply',
        color: 'green',
      },
      {
        label: 'chainflipLending.borrow',
        path: '/chainflip-lending/borrow',
        color: 'purple',
      },
    ],
    [],
  )

  const handleBack = useCallback(() => {
    navigate('/explore')
  }, [navigate])

  const { totalSuppliedFiat, availableLiquidityFiat, totalBorrowedFiat, isLoading } =
    useChainflipLendingPools()

  return (
    <>
      <Display.Mobile>
        <PageHeader>
          <PageHeader.Left>
            <PageBackButton onBack={handleBack} />
          </PageHeader.Left>
          <PageHeader.Middle>
            <PageHeader.Title>{translate('navBar.chainflipLending')}</PageHeader.Title>
          </PageHeader.Middle>
        </PageHeader>
      </Display.Mobile>
      <Stack mb={4}>
        <Container pt={containerPaddingTop} pb={4}>
          <Display.Desktop>
            <Stack>
              <Heading>{translate('navBar.chainflipLending')}</Heading>
              <Text color='text.subtle' translation='chainflipLending.headerDescription' />
            </Stack>
          </Display.Desktop>
          <Flex gap={4} my={6} flexWrap='wrap'>
            <Card flex={responsiveFlex}>
              <CardBody>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Fiat value={totalSuppliedFiat} fontSize='4xl' fontWeight='bold' />
                </Skeleton>
                <Text
                  color='text.success'
                  fontWeight='medium'
                  translation='chainflipLending.totalSupplied'
                />
              </CardBody>
            </Card>
            <Card flex={responsiveFlex}>
              <CardBody>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Fiat value={availableLiquidityFiat} fontSize='4xl' fontWeight='bold' />
                </Skeleton>
                <Text
                  color='blue.300'
                  fontWeight='medium'
                  translation='chainflipLending.availableLiquidity'
                />
              </CardBody>
            </Card>
            <Card flex={responsiveFlex}>
              <CardBody>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Fiat value={totalBorrowedFiat} fontSize='4xl' fontWeight='bold' />
                </Skeleton>
                <Text
                  color='purple.300'
                  fontWeight='medium'
                  translation='chainflipLending.totalBorrowed'
                />
              </CardBody>
            </Card>
          </Flex>
        </Container>
        <TabMenu items={navItems} />
      </Stack>
    </>
  )
}
