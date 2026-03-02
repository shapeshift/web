import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Skeleton,
  Stack,
  VStack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import type { Property } from 'csstype'
import React, { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { Deposit } from './components/Deposit/Deposit'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { Display } from '@/components/Display'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { RawText } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipLendingPools } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

const flexDirPool: ResponsiveValue<Property.FlexDirection> = { base: 'column', lg: 'row' }
const actionColumnMaxWidth = { base: '100%', lg: '500px' }

type PoolHeaderProps = {
  assetId: AssetId
}

const PoolHeader: React.FC<PoolHeaderProps> = ({ assetId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const translate = useTranslate()
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    navigate('/chainflip-lending')
  }, [navigate])

  if (!asset) return null

  return (
    <PageHeader>
      <PageHeader.Left>
        <PageBackButton onBack={handleBack} />
        <Display.Desktop>
          <Flex alignItems='center' gap={2}>
            <AssetIcon assetId={assetId} size='sm' />
            <PageHeader.Title>
              {asset.name} {translate('chainflipLending.market')}
            </PageHeader.Title>
          </Flex>
        </Display.Desktop>
      </PageHeader.Left>
      <Display.Mobile>
        <PageHeader.Middle>
          <PageHeader.Title>
            {asset.name} {translate('chainflipLending.market')}
          </PageHeader.Title>
        </PageHeader.Middle>
      </Display.Mobile>
    </PageHeader>
  )
}

type StatBoxProps = {
  label: string
  children: React.ReactNode
  isLoading: boolean
}

const StatBox: React.FC<StatBoxProps> = ({ label, children, isLoading }) => (
  <Box>
    <RawText fontSize='xs' color='text.subtle' textTransform='uppercase' mb={1}>
      {label}
    </RawText>
    <Skeleton isLoaded={!isLoading}>{children}</Skeleton>
  </Box>
)

export const Pool = () => {
  const translate = useTranslate()
  const location = useLocation()
  const { dispatch: walletDispatch } = useWallet()
  const { accountId, setAccountId } = useChainflipLendingAccount()

  const handleConnectWallet = useCallback(
    () => walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [walletDispatch],
  )

  const poolAssetId = useMemo(() => {
    const [, ...rest] = location.pathname.split('/pool/')
    return (rest.join('/') || '') as AssetId
  }, [location.pathname])

  const asset = useAppSelector(state => selectAssetById(state, poolAssetId))
  const { pools, isLoading } = useChainflipLendingPools()

  const poolData = useMemo(() => pools.find(p => p.assetId === poolAssetId), [pools, poolAssetId])

  const headerComponent = useMemo(() => <PoolHeader assetId={poolAssetId} />, [poolAssetId])

  const utilisationPercent = useMemo(
    () => (poolData ? bnOrZero(poolData.pool.utilisation_rate).div(1e9).toFixed() : '0'),
    [poolData],
  )

  const originationFee = useMemo(
    () => (poolData ? bnOrZero(poolData.pool.origination_fee).div(1e6).toFixed() : '0'),
    [poolData],
  )

  const liquidationFee = useMemo(
    () => (poolData ? bnOrZero(poolData.pool.liquidation_fee).div(1e6).toFixed() : '0'),
    [poolData],
  )

  const totalBorrowedFiat = useMemo(
    () =>
      bnOrZero(poolData?.totalAmountFiat)
        .minus(poolData?.availableAmountFiat ?? '0')
        .toFixed(2),
    [poolData],
  )

  if (!asset) return null

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title={`${asset.name} - Chainflip Lending`} />
      <Flex gap={6} flexDir={flexDirPool}>
        <Stack gap={4} flex={1}>
          <Card>
            <CardBody>
              <Heading as='h5' fontSize='sm' textTransform='uppercase' color='text.subtle' mb={4}>
                {translate('chainflipLending.supplyStats')}
              </Heading>
              <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
                <StatBox label={translate('chainflipLending.totalSupplied')} isLoading={isLoading}>
                  <Amount.Fiat
                    value={poolData?.totalAmountFiat ?? '0'}
                    fontSize='sm'
                    fontWeight='bold'
                  />
                  <Amount.Crypto
                    value={poolData?.totalAmountCryptoPrecision ?? '0'}
                    symbol={asset.symbol}
                    fontSize='xs'
                    color='text.subtle'
                  />
                </StatBox>
                <StatBox label={translate('chainflipLending.supplyApy')} isLoading={isLoading}>
                  <Amount.Percent
                    value={poolData?.supplyApy ?? '0'}
                    fontSize='sm'
                    fontWeight='bold'
                    autoColor
                  />
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.availableLiquidity')}
                  isLoading={isLoading}
                >
                  <Amount.Fiat
                    value={poolData?.availableAmountFiat ?? '0'}
                    fontSize='sm'
                    fontWeight='bold'
                  />
                </StatBox>
              </SimpleGrid>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Heading as='h5' fontSize='sm' textTransform='uppercase' color='text.subtle' mb={4}>
                {translate('chainflipLending.borrowStats')}
              </Heading>
              <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
                <StatBox label={translate('chainflipLending.totalBorrowed')} isLoading={isLoading}>
                  <Amount.Fiat value={totalBorrowedFiat} fontSize='sm' fontWeight='bold' />
                </StatBox>
                <StatBox label={translate('chainflipLending.borrowRate')} isLoading={isLoading}>
                  <Amount.Percent
                    value={poolData?.borrowRate ?? '0'}
                    fontSize='sm'
                    fontWeight='bold'
                  />
                </StatBox>
                <StatBox label={translate('chainflipLending.utilisation')} isLoading={isLoading}>
                  <Amount.Percent value={utilisationPercent} fontSize='sm' fontWeight='bold' />
                </StatBox>
                <StatBox label={translate('chainflipLending.originationFee')} isLoading={isLoading}>
                  <Amount.Percent value={originationFee} fontSize='sm' fontWeight='bold' />
                </StatBox>
                <StatBox label={translate('chainflipLending.liquidationFee')} isLoading={isLoading}>
                  <Amount.Percent value={liquidationFee} fontSize='sm' fontWeight='bold' />
                </StatBox>
              </SimpleGrid>
            </CardBody>
          </Card>
        </Stack>

        <Stack
          maxW={actionColumnMaxWidth}
          w='full'
          position='sticky'
          top={4}
          alignSelf='flex-start'
          gap={4}
        >
          <Card>
            <CardBody p={{ base: 4, md: 5 }}>
              <Flex justifyContent='space-between' alignItems='center' mb={4}>
                <Heading
                  as='h3'
                  size='sm'
                  textTransform='uppercase'
                  color='text.subtle'
                  letterSpacing='wider'
                >
                  {translate('chainflipLending.yourPosition')}
                </Heading>
                {accountId ? (
                  <AccountDropdown
                    assetId={ethAssetId}
                    onChange={setAccountId}
                    defaultAccountId={accountId}
                    autoSelectHighestBalance
                    buttonProps={{ variant: 'ghost', size: 'sm' }}
                  />
                ) : null}
              </Flex>
              <VStack spacing={4} align='stretch'>
                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <RawText fontSize='xs' color='text.subtle' mb={1} textTransform='uppercase'>
                      {translate('chainflipLending.supplied')}
                    </RawText>
                    <Amount.Fiat value='0' fontSize='lg' fontWeight='bold' />
                    {accountId ? (
                      <Amount.Crypto
                        value='0'
                        symbol={asset.symbol}
                        fontSize='xs'
                        color='text.subtle'
                      />
                    ) : null}
                  </Box>
                  <Box>
                    <RawText fontSize='xs' color='text.subtle' mb={1} textTransform='uppercase'>
                      {translate('chainflipLending.collateral')}
                    </RawText>
                    <Amount.Fiat value='0' fontSize='lg' fontWeight='bold' />
                    {accountId ? (
                      <Amount.Crypto
                        value='0'
                        symbol={asset.symbol}
                        fontSize='xs'
                        color='text.subtle'
                      />
                    ) : null}
                  </Box>
                </SimpleGrid>
                {accountId ? (
                  <Display.Desktop>
                    <HStack spacing={3} pt={2}>
                      <Button
                        colorScheme='blue'
                        size='lg'
                        height={12}
                        borderRadius='xl'
                        flex={1}
                        fontWeight='bold'
                      >
                        {translate('chainflipLending.supply')}
                      </Button>
                      <Button
                        variant='outline'
                        size='lg'
                        height={12}
                        borderRadius='xl'
                        flex={1}
                        fontWeight='bold'
                      >
                        {translate('chainflipLending.borrow')}
                      </Button>
                    </HStack>
                  </Display.Desktop>
                ) : (
                  <Button
                    colorScheme='blue'
                    size='lg'
                    height={12}
                    borderRadius='xl'
                    onClick={handleConnectWallet}
                    width='full'
                    fontWeight='bold'
                  >
                    {translate('common.connectWallet')}
                  </Button>
                )}
              </VStack>
            </CardBody>
          </Card>

          <Card>
            <CardBody p={0}>
              <Heading
                as='h3'
                size='sm'
                textTransform='uppercase'
                color='text.subtle'
                letterSpacing='wider'
                px={{ base: 4, md: 5 }}
                pt={{ base: 4, md: 5 }}
                pb={2}
              >
                {translate('chainflipLending.depositToChainflip')}
              </Heading>
              <Deposit assetId={poolAssetId} />
            </CardBody>
          </Card>
        </Stack>
      </Flex>
    </Main>
  )
}
