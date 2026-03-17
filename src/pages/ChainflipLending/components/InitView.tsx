import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CircularProgress,
  Flex,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { btcAssetId, ethAssetId, solAssetId, usdcAssetId, usdtAssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { TbRefresh, TbSparkles } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { Text } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { permillToDecimal } from '@/lib/chainflip/utils'
import type { ChainflipLendingPoolWithFiat } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import { useChainflipLendingPools } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'

const LENDING_ASSET_IDS = Object.keys(CHAINFLIP_LENDING_ASSET_BY_ASSET_ID) as AssetId[]

const marketRowGrid = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '200px repeat(4, 1fr)',
}

const mobileDisplay = { base: 'none', md: 'flex' }

type MarketRowProps = {
  pool: ChainflipLendingPoolWithFiat
  onViewMarket: (assetId: AssetId) => void
}

const MarketRow = memo(({ pool, onViewMarket }: MarketRowProps) => {
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
    >
      <AssetCell assetId={pool.assetId} />
      <Flex display={mobileDisplay}>
        <Amount.Percent value={pool.supplyApy} autoColor />
      </Flex>
      <Flex display={mobileDisplay}>
        <Amount.Fiat value={pool.totalAmountFiat} />
      </Flex>
      <Flex display={mobileDisplay}>
        <Amount.Fiat
          value={bnOrZero(pool.totalAmountFiat).minus(pool.availableAmountFiat).toFixed(2)}
        />
      </Flex>
      <HStack spacing={2}>
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
  // Positions for the orbital arrangement of asset icons
  // Center is at roughly (120, 100) within a 240x200 box
  const positions = [
    { assetId: btcAssetId, top: '10%', left: '50%', size: 'md' },
    { assetId: ethAssetId, top: '30%', left: '15%', size: 'sm' },
    { assetId: usdcAssetId, top: '25%', left: '80%', size: 'md' },
    { assetId: usdtAssetId, top: '65%', left: '25%', size: 'sm' },
    { assetId: solAssetId, top: '70%', left: '72%', size: 'xs' },
  ] as const

  return (
    <Box position='relative' width='240px' height='200px' display={{ base: 'none', lg: 'block' }}>
      {/* Subtle orbital ring */}
      <Box
        position='absolute'
        top='50%'
        left='50%'
        transform='translate(-50%, -50%)'
        width='180px'
        height='140px'
        borderRadius='50%'
        border='1px solid'
        borderColor='whiteAlpha.100'
      />
      <Box
        position='absolute'
        top='50%'
        left='50%'
        transform='translate(-50%, -50%) rotate(30deg)'
        width='200px'
        height='120px'
        borderRadius='50%'
        border='1px solid'
        borderColor='whiteAlpha.50'
      />
      {positions.map(({ assetId, top, left, size }) => (
        <Box
          key={assetId}
          position='absolute'
          top={top}
          left={left}
          transform='translate(-50%, -50%)'
        >
          <AssetIcon assetId={assetId} size={size} />
        </Box>
      ))}
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
    <Stack spacing={4}>
      <Heading size='md'>{translate('chainflipLending.dashboard.lendingMarkets')}</Heading>
      <Stack>
        <SimpleGrid
          gridTemplateColumns={marketRowGrid}
          columnGap={4}
          color='text.subtle'
          fontWeight='bold'
          fontSize='sm'
          px={4}
        >
          <Text translation='chainflipLending.poolHeader' />
          <Flex display={mobileDisplay}>
            <HelperTooltip label={translate('chainflipLending.supplyApyTooltip')}>
              <Text translation='chainflipLending.supplyApy' />
            </HelperTooltip>
          </Flex>
          <Flex display={mobileDisplay}>
            <HelperTooltip label={translate('chainflipLending.totalSuppliedTooltip')}>
              <Text translation='chainflipLending.totalSupplied' />
            </HelperTooltip>
          </Flex>
          <Flex display={mobileDisplay}>
            <HelperTooltip label={translate('chainflipLending.totalBorrowedTooltip')}>
              <Text translation='chainflipLending.totalBorrowed' />
            </HelperTooltip>
          </Flex>
          <HelperTooltip label={translate('chainflipLending.utilisationTooltip')}>
            <Text translation='chainflipLending.utilisation' />
          </HelperTooltip>
        </SimpleGrid>
        <Stack mx={{ base: 0, lg: 0, xl: -4 }}>{marketRows}</Stack>
      </Stack>
    </Stack>
  )
})

type InfoCardProps = {
  titleKey: string
  descriptionKey: string
  icon: React.ElementType
  accentColor: string
}

const InfoCard = memo(({ titleKey, descriptionKey, icon, accentColor }: InfoCardProps) => {
  return (
    <Card>
      <CardBody>
        <HStack spacing={4} alignItems='flex-start'>
          <Flex
            borderRadius='lg'
            bg={`${accentColor}.900`}
            p={2}
            alignItems='center'
            justifyContent='center'
            flexShrink={0}
          >
            <Icon as={icon} boxSize={5} color={`${accentColor}.400`} />
          </Flex>
          <Stack spacing={1}>
            <Text translation={titleKey} fontWeight='bold' fontSize='md' />
            <Text translation={descriptionKey} color='text.subtle' fontSize='sm' />
          </Stack>
        </HStack>
      </CardBody>
    </Card>
  )
})

export const InitView = memo(() => {
  const translate = useTranslate()
  const chainflipLendingModal = useModal('chainflipLending')

  const handleDeposit = useCallback(() => {
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId) chainflipLendingModal.open({ mode: 'deposit', assetId: firstAssetId })
  }, [chainflipLendingModal])

  return (
    <Stack spacing={8}>
      {/* Hero Card */}
      <Card bg='background.surface.raised.base' overflow='hidden'>
        <CardBody py={8} px={8}>
          <Flex justifyContent='space-between' alignItems='center'>
            <Stack spacing={4} alignItems='flex-start' maxW='600px'>
              <Badge colorScheme='blue' fontSize='xs' px={2} py={1} borderRadius='full'>
                {translate('chainflipLending.dashboard.getStarted')}
              </Badge>
              <Heading size='lg'>
                {translate('chainflipLending.dashboard.depositFirstAsset')}
              </Heading>
              <Text
                translation='chainflipLending.dashboard.depositFirstAssetDescription'
                color='text.subtle'
                fontSize='md'
              />
              <Button colorScheme='blue' size='lg' onClick={handleDeposit}>
                + {translate('chainflipLending.dashboard.deposit')}
              </Button>
              <Text
                translation='chainflipLending.dashboard.requiresFlip'
                fontSize='sm'
                color='text.subtle'
              />
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
          icon={TbSparkles}
          accentColor='green'
        />
        <InfoCard
          titleKey='chainflipLending.dashboard.borrowAgainstCollateral'
          descriptionKey='chainflipLending.dashboard.borrowAgainstCollateralDescription'
          icon={TbRefresh}
          accentColor='purple'
        />
      </SimpleGrid>
    </Stack>
  )
})
