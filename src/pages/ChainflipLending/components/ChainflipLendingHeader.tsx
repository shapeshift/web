import { Button, Card, CardBody, Container, Flex, Heading, Skeleton, Stack } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Amount } from '@/components/Amount/Amount'
import { Display } from '@/components/Display'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import type { TabItem } from '@/components/TabMenu/TabMenu'
import { TabMenu } from '@/components/TabMenu/TabMenu'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipLendingPools } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'

const responsiveFlex = { base: 'auto', lg: 1 }
const containerPaddingTop = { base: 0, md: 8 }

const navItems: TabItem[] = [
  {
    label: 'chainflipLending.markets',
    path: '/chainflip-lending',
    color: 'blue',
    exact: true,
  },
  {
    label: 'chainflipLending.myBalances',
    path: '/chainflip-lending/balances',
    color: 'green',
  },
]

export const ChainflipLendingHeader = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { dispatch: walletDispatch } = useWallet()
  const { accountId, setAccountId } = useChainflipLendingAccount()

  const handleBack = useCallback(() => {
    navigate('/explore')
  }, [navigate])

  const handleConnectWallet = useCallback(
    () => walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [walletDispatch],
  )

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
            <Flex justifyContent='space-between' alignItems='flex-start'>
              <Stack>
                <Heading>{translate('navBar.chainflipLending')}</Heading>
                <Text color='text.subtle' translation='chainflipLending.headerDescription' />
              </Stack>
              <AccountDropdown
                assetId={ethAssetId}
                onChange={setAccountId}
                {...(accountId ? { defaultAccountId: accountId } : {})}
                autoSelectHighestBalance
              />
            </Flex>
          </Display.Desktop>
          <Flex gap={4} my={6} flexWrap='wrap'>
            <Card flex={responsiveFlex}>
              <CardBody>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Fiat value={totalSuppliedFiat} fontSize='4xl' fontWeight='bold' />
                </Skeleton>
                <HelperTooltip label={translate('chainflipLending.totalSuppliedTooltip')}>
                  <Text
                    color='text.success'
                    fontWeight='medium'
                    translation='chainflipLending.totalSupplied'
                  />
                </HelperTooltip>
              </CardBody>
            </Card>
            <Card flex={responsiveFlex}>
              <CardBody>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Fiat value={availableLiquidityFiat} fontSize='4xl' fontWeight='bold' />
                </Skeleton>
                <HelperTooltip label={translate('chainflipLending.availableLiquidityTooltip')}>
                  <Text
                    color='blue.300'
                    fontWeight='medium'
                    translation='chainflipLending.availableLiquidity'
                  />
                </HelperTooltip>
              </CardBody>
            </Card>
            <Card flex={responsiveFlex}>
              <CardBody>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Fiat value={totalBorrowedFiat} fontSize='4xl' fontWeight='bold' />
                </Skeleton>
                <HelperTooltip label={translate('chainflipLending.totalBorrowedTooltip')}>
                  <Text
                    color='purple.300'
                    fontWeight='medium'
                    translation='chainflipLending.totalBorrowed'
                  />
                </HelperTooltip>
              </CardBody>
            </Card>
          </Flex>
          {!accountId && (
            <Flex mb={4}>
              <Button colorScheme='blue' size='sm' onClick={handleConnectWallet}>
                {translate('common.connectWallet')}
              </Button>
            </Flex>
          )}
        </Container>
        <TabMenu items={navItems} />
      </Stack>
    </>
  )
}
