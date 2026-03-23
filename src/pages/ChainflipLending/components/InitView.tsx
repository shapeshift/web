import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Center,
  CircularProgress,
  Flex,
  HStack,
  SimpleGrid,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { btcAssetId, ethAssetId, solAssetId, usdcAssetId, usdtAssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import borrowGlow from '@/assets/chainflip-lending/borrow-glow.svg'
import borrowRing1 from '@/assets/chainflip-lending/borrow-ring-1.svg'
import borrowRing2 from '@/assets/chainflip-lending/borrow-ring-2.svg'
import borrowRing3 from '@/assets/chainflip-lending/borrow-ring-3.svg'
import borrowRingInner from '@/assets/chainflip-lending/borrow-ring-inner.svg'
import earnGlow from '@/assets/chainflip-lending/earn-glow.svg'
import earnRingInner from '@/assets/chainflip-lending/earn-ring-inner.svg'
import earnRingMiddle from '@/assets/chainflip-lending/earn-ring-middle.svg'
import earnRingOuter from '@/assets/chainflip-lending/earn-ring-outer.svg'
import orbitalBtc from '@/assets/chainflip-lending/orbital-btc.svg'
import orbitalEth from '@/assets/chainflip-lending/orbital-eth.svg'
import orbitalSol from '@/assets/chainflip-lending/orbital-sol.svg'
import orbitalTether from '@/assets/chainflip-lending/orbital-tether.svg'
import orbitalUsdc from '@/assets/chainflip-lending/orbital-usdc.svg'
import refreshIcon from '@/assets/chainflip-lending/refresh-icon.svg'
import sparklesIcon from '@/assets/chainflip-lending/sparkles-icon.svg'
import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { RawText, Text } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { permillToDecimal } from '@/lib/chainflip/utils'
import type { ChainflipLendingPoolWithFiat } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import { useChainflipLendingPools } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

const LENDING_ASSET_IDS = Object.keys(CHAINFLIP_LENDING_ASSET_BY_ASSET_ID) as AssetId[]

const marketRowGrid = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '200px repeat(5, 1fr)',
}

const mobileDisplay = { base: 'none', md: 'flex' }

type MarketRowProps = {
  pool: ChainflipLendingPoolWithFiat
  onViewMarket: (assetId: AssetId) => void
}

const MarketRow = memo(({ pool, onViewMarket }: MarketRowProps) => {
  const asset = useAppSelector(state =>
    pool.assetId ? selectAssetById(state, pool.assetId) : undefined,
  )
  const handleClick = useCallback(() => {
    if (pool.assetId) onViewMarket(pool.assetId)
  }, [pool.assetId, onViewMarket])

  const utilisationPercent = useMemo(
    () => permillToDecimal(pool.pool.utilisation_rate),
    [pool.pool.utilisation_rate],
  )

  const utilisationNumber = useMemo(
    () => bnOrZero(utilisationPercent).times(100).toNumber(),
    [utilisationPercent],
  )

  const utilisationColor = useMemo(() => {
    if (utilisationNumber >= 90) return 'red.400'
    if (utilisationNumber >= 70) return 'orange.400'
    return 'blue.400'
  }, [utilisationNumber])

  if (!pool.assetId) return null

  return (
    <Button
      variant='ghost'
      display='grid'
      gridTemplateColumns={marketRowGrid}
      columnGap={4}
      alignItems='center'
      textAlign='left'
      py={4}
      width='full'
      height='auto'
      color='text.base'
      onClick={handleClick}
      data-testid={`chainflip-lending-market-row-${asset?.symbol?.toLowerCase() ?? 'unknown'}`}
    >
      <AssetCell assetId={pool.assetId} />
      <Flex display={mobileDisplay} justifyContent='flex-end'>
        <Amount.Percent value={pool.supplyApy} autoColor />
      </Flex>
      <Flex display={mobileDisplay} justifyContent='flex-end'>
        <Amount.Fiat value={pool.totalAmountFiat} />
      </Flex>
      <Flex display={mobileDisplay} justifyContent='flex-end'>
        <Amount.Percent value={pool.borrowRate} autoColor />
      </Flex>
      <Flex display={mobileDisplay} justifyContent='flex-end'>
        <Amount.Fiat
          value={bnOrZero(pool.totalAmountFiat).minus(pool.availableAmountFiat).toFixed(2)}
        />
      </Flex>
      <HStack spacing={2} justifyContent='flex-end'>
        <CircularProgress
          value={utilisationNumber}
          size='24px'
          thickness='10px'
          color={utilisationColor}
          trackColor='whiteAlpha.100'
        />
        <Amount.Percent value={utilisationPercent} />
      </HStack>
    </Button>
  )
})

const AssetConstellation = memo(() => {
  // Exact positions from Figma design context (2918:4222)
  // Container is positioned absolutely from left=590px in the original ~1200px wide card
  // We scale proportionally to fit our responsive layout
  return (
    <Box
      position='relative'
      width={{ base: '300px', xl: '440px' }}
      height='260px'
      flexShrink={0}
      display={{ base: 'none', lg: 'block' }}
      overflow='visible'
    >
      {/* Orbital ring SVGs from Figma - ETH blue arc */}
      <Box
        as='img'
        src={orbitalEth}
        position='absolute'
        top='-30px'
        left='40px'
        width='418px'
        height='417px'
        opacity={0.6}
      />
      {/* BTC orange arc */}
      <Box
        as='img'
        src={orbitalBtc}
        position='absolute'
        top='30px'
        left='-10px'
        width='378px'
        height='377px'
        opacity={0.6}
      />
      {/* USDC arc */}
      <Box
        as='img'
        src={orbitalUsdc}
        position='absolute'
        top='-60px'
        left='20px'
        width='218px'
        height='218px'
        transform='rotate(180deg)'
        opacity={0.5}
      />
      {/* Tether arc */}
      <Box
        as='img'
        src={orbitalTether}
        position='absolute'
        top='-40px'
        right='-30px'
        width='274px'
        height='275px'
        opacity={0.5}
      />
      {/* SOL arc */}
      <Box
        as='img'
        src={orbitalSol}
        position='absolute'
        bottom='-20px'
        right='-20px'
        width='230px'
        height='230px'
        opacity={0.5}
      />
      {/* Asset icons - positioned per Figma */}
      {/* USDC - top left */}
      <Box position='absolute' top='15px' left='30px'>
        <AssetIcon assetId={usdcAssetId} size='md' showNetworkIcon={false} />
      </Box>
      {/* ETH - center, largest */}
      <Box position='absolute' top='25px' left='150px'>
        <AssetIcon
          assetId={ethAssetId}
          size='lg'
          showNetworkIcon={false}
          sx={{ width: '110px', height: '110px' }}
        />
      </Box>
      {/* USDT - top right */}
      <Box position='absolute' top='0px' right='10px'>
        <AssetIcon
          assetId={usdtAssetId}
          size='md'
          showNetworkIcon={false}
          sx={{ width: '64px', height: '64px' }}
        />
      </Box>
      {/* BTC - bottom center-left */}
      <Box position='absolute' bottom='20px' left='100px'>
        <AssetIcon
          assetId={btcAssetId}
          size='md'
          showNetworkIcon={false}
          sx={{ width: '80px', height: '80px' }}
        />
      </Box>
      {/* SOL - bottom right */}
      <Box position='absolute' bottom='10px' right='20px'>
        <AssetIcon
          assetId={solAssetId}
          size='sm'
          showNetworkIcon={false}
          sx={{ width: '56px', height: '56px' }}
        />
      </Box>
    </Box>
  )
})

const MarketsTable = memo(() => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { pools, isLoading } = useChainflipLendingPools()

  const handleViewMarket = useCallback(
    (assetId: AssetId) => {
      navigate(`/chainflip-lending/pool/${assetId}`)
    },
    [navigate],
  )

  const sortedPools = useMemo(
    () => [...pools].sort((a, b) => bnOrZero(b.supplyApy).minus(a.supplyApy).toNumber()),
    [pools],
  )

  const marketRows = useMemo(() => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={16} />)
    }

    return sortedPools.map(pool =>
      pool.assetId ? (
        <MarketRow key={pool.assetId} pool={pool} onViewMarket={handleViewMarket} />
      ) : null,
    )
  }, [isLoading, sortedPools, handleViewMarket])

  return (
    <Box
      borderWidth='1px'
      borderColor='rgba(255, 255, 255, 0.08)'
      borderRadius='2xl'
      overflow='hidden'
    >
      <Box bg='rgba(255, 255, 255, 0.04)' p={4}>
        <Stack spacing={0}>
          <Flex alignItems='center' gap={2}>
            <RawText fontSize='md' fontWeight='medium'>
              {translate('chainflipLending.dashboard.lendingMarkets')}
            </RawText>
            <HelperTooltip
              label={translate('chainflipLending.dashboard.lendingMarketsDescription')}
            />
          </Flex>
          <RawText fontSize='sm' fontWeight='medium' color='rgba(255, 255, 255, 0.36)'>
            {translate('chainflipLending.dashboard.lendingMarketsDescription')}
          </RawText>
        </Stack>
      </Box>
      <SimpleGrid
        gridTemplateColumns={marketRowGrid}
        columnGap={4}
        color='rgba(255, 255, 255, 0.36)'
        fontWeight='medium'
        fontSize='sm'
        px={4}
        py={2}
      >
        <Text translation='chainflipLending.poolHeader' />
        <Flex display={mobileDisplay} justifyContent='flex-end'>
          <HelperTooltip label={translate('chainflipLending.supplyApyTooltip')}>
            <Text translation='chainflipLending.supplyApy' />
          </HelperTooltip>
        </Flex>
        <Flex display={mobileDisplay} justifyContent='flex-end'>
          <HelperTooltip label={translate('chainflipLending.totalSuppliedTooltip')}>
            <Text translation='chainflipLending.totalSupplied' />
          </HelperTooltip>
        </Flex>
        <Flex display={mobileDisplay} justifyContent='flex-end'>
          <HelperTooltip label={translate('chainflipLending.borrowAprTooltip')}>
            <Text translation='chainflipLending.borrowApr' />
          </HelperTooltip>
        </Flex>
        <Flex display={mobileDisplay} justifyContent='flex-end'>
          <HelperTooltip label={translate('chainflipLending.totalBorrowedTooltip')}>
            <Text translation='chainflipLending.totalBorrowed' />
          </HelperTooltip>
        </Flex>
        <Flex justifyContent='flex-end'>
          <HelperTooltip label={translate('chainflipLending.utilisationTooltip')}>
            <Text translation='chainflipLending.utilisation' />
          </HelperTooltip>
        </Flex>
      </SimpleGrid>
      <Stack spacing={0}>{marketRows}</Stack>
    </Box>
  )
})

type InfoCardProps = {
  titleKey: string
  descriptionKey: string
  accentColor: string
  onClick?: () => void
  'data-testid'?: string
}

const InfoCard = memo(
  ({ titleKey, descriptionKey, accentColor, onClick, 'data-testid': testId }: InfoCardProps) => {
    const isGreen = accentColor === 'green'

    return (
      <Card
        data-testid={testId}
        overflow='hidden'
        position='relative'
        borderRadius='2xl'
        bg='rgba(255, 255, 255, 0.04)'
        borderWidth='1px'
        borderColor='rgba(255, 255, 255, 0.06)'
        cursor={onClick ? 'pointer' : undefined}
        onClick={onClick}
        transition='all 0.2s ease-in-out'
        _hover={
          onClick ? { borderColor: 'border.hover', bg: 'rgba(255, 255, 255, 0.06)' } : undefined
        }
      >
        <CardBody py={10} px={8}>
          <Flex justifyContent='space-between' alignItems='center'>
            <Stack spacing={2} maxW='60%'>
              <Text translation={titleKey} fontWeight='medium' fontSize='md' />
              <Text
                translation={descriptionKey}
                color='text.subtle'
                fontSize='sm'
                lineHeight='tall'
                opacity={0.4}
              />
            </Stack>
            {/* Art from Figma SVGs */}
            <Box position='relative' width='160px' height='120px' flexShrink={0}>
              {isGreen ? (
                <>
                  {/* Earn Yield art - concentric green arcs */}
                  <Box
                    as='img'
                    src={earnGlow}
                    position='absolute'
                    top='-40px'
                    right='-50px'
                    width='339px'
                    height='339px'
                  />
                  <Box
                    as='img'
                    src={earnRingOuter}
                    position='absolute'
                    top='-10px'
                    right='-10px'
                    width='160px'
                    height='160px'
                  />
                  <Box
                    as='img'
                    src={earnRingMiddle}
                    position='absolute'
                    top='2px'
                    right='2px'
                    width='130px'
                    height='130px'
                  />
                  <Box
                    as='img'
                    src={earnRingInner}
                    position='absolute'
                    top='16px'
                    right='16px'
                    width='96px'
                    height='96px'
                  />
                  <Center
                    position='absolute'
                    top='28px'
                    right='28px'
                    width='64px'
                    height='64px'
                    borderRadius='full'
                    bg='rgba(0, 205, 152, 0.05)'
                    boxShadow='inset 0 1px 0 0 rgba(0, 205, 152, 0.25)'
                  >
                    <Box as='img' src={sparklesIcon} width='28px' height='28px' />
                  </Center>
                </>
              ) : (
                <>
                  {/* Borrow art - purple rings with radiating lines */}
                  <Box
                    as='img'
                    src={borrowGlow}
                    position='absolute'
                    top='-40px'
                    right='-50px'
                    width='304px'
                    height='304px'
                  />
                  <Box
                    as='img'
                    src={borrowRing1}
                    position='absolute'
                    top='-5px'
                    right='0px'
                    width='140px'
                    height='140px'
                    transform='rotate(45deg)'
                  />
                  <Box
                    as='img'
                    src={borrowRing2}
                    position='absolute'
                    top='-30px'
                    right='-25px'
                    width='150px'
                    height='150px'
                    transform='rotate(-135deg)'
                  />
                  <Box
                    as='img'
                    src={borrowRing3}
                    position='absolute'
                    top='-20px'
                    right='-15px'
                    width='140px'
                    height='140px'
                    transform='rotate(-135deg)'
                  />
                  <Box
                    as='img'
                    src={borrowRingInner}
                    position='absolute'
                    top='8px'
                    right='14px'
                    width='96px'
                    height='96px'
                    transform='rotate(45deg)'
                  />
                  <Center
                    position='absolute'
                    top='24px'
                    right='30px'
                    width='64px'
                    height='64px'
                    borderRadius='full'
                    bg='rgba(128, 90, 213, 0.1)'
                    borderWidth='1px'
                    borderColor='blue.500'
                    backdropFilter='blur(25px)'
                  >
                    <Box as='img' src={refreshIcon} width='28px' height='28px' />
                  </Center>
                </>
              )}
            </Box>
          </Flex>
        </CardBody>
      </Card>
    )
  },
)

type InitViewProps = {
  onCtaClick?: () => void
  ctaLabel?: string
  'data-testid'?: string
}

export const InitView = memo(({ onCtaClick, ctaLabel, 'data-testid': testId }: InitViewProps) => {
  const translate = useTranslate()
  const chainflipLendingModal = useModal('chainflipLending')

  const handleDeposit = useCallback(() => {
    if (onCtaClick) {
      onCtaClick()
      return
    }
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId) chainflipLendingModal.open({ mode: 'deposit', assetId: firstAssetId })
  }, [chainflipLendingModal, onCtaClick])

  const handleSupply = useCallback(() => {
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId) chainflipLendingModal.open({ mode: 'supply', assetId: firstAssetId })
  }, [chainflipLendingModal])

  const handleBorrow = useCallback(() => {
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId) chainflipLendingModal.open({ mode: 'borrow', assetId: firstAssetId })
  }, [chainflipLendingModal])

  return (
    <Stack spacing={8} data-testid={testId}>
      {/* Hero Card */}
      <Card
        bg='rgba(255, 255, 255, 0.04)'
        borderWidth='1px'
        borderColor='rgba(255, 255, 255, 0.06)'
        overflow='hidden'
        borderRadius='2xl'
        data-testid='chainflip-lending-get-started'
      >
        <CardBody py={{ base: 6, lg: 16 }} px={{ base: 6, lg: 8 }}>
          <Flex justifyContent='space-between' alignItems='center' gap={6}>
            <Stack spacing={6} alignItems='flex-start' maxW='597px'>
              <Stack spacing={2} alignItems='flex-start'>
                <Badge
                  bg='rgba(255, 255, 255, 0.04)'
                  borderWidth='1px'
                  borderColor='rgba(255, 255, 255, 0.04)'
                  color='white'
                  fontSize='xs'
                  px={2}
                  py={0}
                  borderRadius='full'
                  fontWeight='medium'
                >
                  {translate('chainflipLending.dashboard.getStarted')}
                </Badge>
                <RawText fontSize='lg' fontWeight='medium' lineHeight='7'>
                  {translate('chainflipLending.dashboard.depositFirstAsset')}
                </RawText>
                <RawText fontSize='md' fontWeight='medium' lineHeight='6' opacity={0.4}>
                  {translate('chainflipLending.dashboard.depositFirstAssetDescription')}
                </RawText>
              </Stack>
              <HStack spacing={4} alignItems='center'>
                <Button
                  colorScheme='blue'
                  size='md'
                  height={10}
                  borderRadius='xl'
                  fontWeight='semibold'
                  onClick={handleDeposit}
                  data-testid='chainflip-lending-init-deposit'
                >
                  {ctaLabel ?? `+ ${translate('chainflipLending.dashboard.deposit')}`}
                </Button>
                <RawText fontSize='xs' fontWeight='medium' opacity={0.4}>
                  {translate('chainflipLending.dashboard.requiresFlip')}
                </RawText>
              </HStack>
            </Stack>
            <AssetConstellation />
          </Flex>
        </CardBody>
      </Card>

      {/* Lending Markets Table */}
      <MarketsTable />

      {/* Info Cards */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <InfoCard
          titleKey='chainflipLending.dashboard.earnYield'
          descriptionKey='chainflipLending.dashboard.earnYieldDescription'
          accentColor='green'
          onClick={handleSupply}
          data-testid='chainflip-lending-earn-yield-card'
        />
        <InfoCard
          titleKey='chainflipLending.dashboard.borrowAgainstCollateral'
          descriptionKey='chainflipLending.dashboard.borrowAgainstCollateralDescription'
          accentColor='purple'
          onClick={handleBorrow}
          data-testid='chainflip-lending-borrow-card'
        />
      </SimpleGrid>
    </Stack>
  )
})
