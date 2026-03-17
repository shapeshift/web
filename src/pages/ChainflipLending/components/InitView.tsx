import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Center,
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
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

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
  return (
    <Box
      position='relative'
      width={{ base: '280px', xl: '420px' }}
      height='220px'
      flexShrink={0}
      display={{ base: 'none', lg: 'block' }}
      overflow='visible'
    >
      {/* Orbital arc - sweeping from top-left to bottom-right (dark blue) */}
      <Box
        position='absolute'
        top='-60px'
        left='-40px'
        width='460px'
        height='340px'
        borderRadius='50%'
        border='1.5px solid'
        borderColor='rgba(55, 97, 249, 0.25)'
      />
      {/* Orbital arc - bottom arc (green/orange tinted) */}
      <Box
        position='absolute'
        bottom='-80px'
        left='0px'
        width='400px'
        height='280px'
        borderRadius='50%'
        border='1.5px solid'
        borderColor='rgba(255, 170, 50, 0.2)'
      />
      {/* USDC - top left, medium */}
      <Box position='absolute' top='0%' left='8%'>
        <AssetIcon assetId={usdcAssetId} size='sm' showNetworkIcon={false} sx={{ width: '52px', height: '52px' }} />
      </Box>
      {/* ETH - center, largest */}
      <Box position='absolute' top='5%' left='38%'>
        <AssetIcon assetId={ethAssetId} size='lg' showNetworkIcon={false} sx={{ width: '88px', height: '88px' }} />
      </Box>
      {/* USDT - top right, medium-large */}
      <Box position='absolute' top='-5%' left='78%'>
        <AssetIcon assetId={usdtAssetId} size='md' showNetworkIcon={false} sx={{ width: '60px', height: '60px' }} />
      </Box>
      {/* BTC - bottom center-left, large */}
      <Box position='absolute' top='58%' left='30%'>
        <AssetIcon assetId={btcAssetId} size='md' showNetworkIcon={false} sx={{ width: '72px', height: '72px' }} />
      </Box>
      {/* SOL - bottom right, medium */}
      <Box position='absolute' top='50%' left='72%'>
        <AssetIcon assetId={solAssetId} size='sm' showNetworkIcon={false} sx={{ width: '52px', height: '52px' }} />
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
  'data-testid'?: string
}

const InfoCard = memo(
  ({ titleKey, descriptionKey, icon, accentColor, 'data-testid': testId }: InfoCardProps) => {
    const iconColor = `${accentColor}.500`
    const bgGlow = `${accentColor}.900`
    const ringColor =
      accentColor === 'green' ? 'rgba(0, 205, 152, 0.2)' : 'rgba(128, 90, 213, 0.2)'
    const ringColorStrong =
      accentColor === 'green' ? 'rgba(0, 205, 152, 0.35)' : 'rgba(128, 90, 213, 0.35)'

    return (
      <Card
        data-testid={testId}
        overflow='hidden'
        position='relative'
        borderRadius='xl'
      >
        <CardBody py={8} px={6}>
          <Flex justifyContent='space-between' alignItems='center' minH='80px'>
            <Stack spacing={2} flex={1} pr={4} maxW='60%'>
              <Text translation={titleKey} fontWeight='bold' fontSize='md' />
              <Text translation={descriptionKey} color='text.subtle' fontSize='sm' lineHeight='tall' />
            </Stack>
            {/* Decorative art - concentric arcs with centered icon */}
            <Box position='relative' width='120px' height='100px' flexShrink={0}>
              {/* Outer arc */}
              <Box
                position='absolute'
                bottom='-30px'
                right='-10px'
                width='160px'
                height='160px'
                borderRadius='full'
                border='1px solid'
                borderColor={ringColor}
              />
              {/* Middle arc */}
              <Box
                position='absolute'
                bottom='-10px'
                right='10px'
                width='120px'
                height='120px'
                borderRadius='full'
                border='1px solid'
                borderColor={ringColorStrong}
              />
              {/* Inner circle with icon */}
              <Center
                position='absolute'
                bottom='10px'
                right='30px'
                width='56px'
                height='56px'
                borderRadius='full'
                bg={bgGlow}
                boxShadow={`inset 0 1px 0 0 ${ringColorStrong}`}
              >
                <Icon as={icon} boxSize={6} color={iconColor} />
              </Center>
              {/* Radial lines for borrow card */}
              {accentColor === 'purple' && (
                <>
                  <Box
                    position='absolute'
                    bottom='36px'
                    right='56px'
                    width='1px'
                    height='40px'
                    bg={ringColor}
                    transform='rotate(0deg)'
                    transformOrigin='bottom'
                  />
                  <Box
                    position='absolute'
                    bottom='36px'
                    right='56px'
                    width='1px'
                    height='40px'
                    bg={ringColor}
                    transform='rotate(90deg)'
                    transformOrigin='bottom'
                  />
                  <Box
                    position='absolute'
                    bottom='36px'
                    right='56px'
                    width='1px'
                    height='40px'
                    bg={ringColor}
                    transform='rotate(45deg)'
                    transformOrigin='bottom'
                  />
                  <Box
                    position='absolute'
                    bottom='36px'
                    right='56px'
                    width='1px'
                    height='40px'
                    bg={ringColor}
                    transform='rotate(-45deg)'
                    transformOrigin='bottom'
                  />
                </>
              )}
            </Box>
          </Flex>
        </CardBody>
      </Card>
    )
  },
)

export const InitView = memo(({ 'data-testid': testId }: { 'data-testid'?: string }) => {
  const translate = useTranslate()
  const chainflipLendingModal = useModal('chainflipLending')

  const handleDeposit = useCallback(() => {
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId) chainflipLendingModal.open({ mode: 'deposit', assetId: firstAssetId })
  }, [chainflipLendingModal])

  return (
    <Stack spacing={8} data-testid={testId}>
      {/* Hero Card */}
      <Card
        bg='background.surface.raised.base'
        overflow='hidden'
        borderRadius='2xl'
        data-testid='chainflip-lending-get-started'
      >
        <CardBody py={{ base: 6, lg: 10 }} px={{ base: 6, lg: 10 }}>
          <Flex justifyContent='space-between' alignItems='flex-start' gap={4}>
            <Stack spacing={5} alignItems='flex-start' maxW='480px'>
              <Badge
                colorScheme='blue'
                fontSize='xs'
                px={3}
                py={1}
                borderRadius='full'
                fontWeight='semibold'
              >
                {translate('chainflipLending.dashboard.getStarted')}
              </Badge>
              <Heading size='lg' lineHeight='shorter'>
                {translate('chainflipLending.dashboard.depositFirstAsset')}
              </Heading>
              <Text
                translation='chainflipLending.dashboard.depositFirstAssetDescription'
                color='text.subtle'
                fontSize='sm'
                lineHeight='tall'
              />
              <HStack spacing={4} alignItems='center'>
                <Button
                  colorScheme='blue'
                  size='md'
                  onClick={handleDeposit}
                  data-testid='chainflip-lending-init-deposit'
                >
                  + {translate('chainflipLending.dashboard.deposit')}
                </Button>
                <Text
                  translation='chainflipLending.dashboard.requiresFlip'
                  fontSize='xs'
                  color='text.subtle'
                />
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
          icon={TbSparkles}
          accentColor='green'
          data-testid='chainflip-lending-earn-yield-card'
        />
        <InfoCard
          titleKey='chainflipLending.dashboard.borrowAgainstCollateral'
          descriptionKey='chainflipLending.dashboard.borrowAgainstCollateralDescription'
          icon={TbRefresh}
          accentColor='purple'
          data-testid='chainflip-lending-borrow-card'
        />
      </SimpleGrid>
    </Stack>
  )
})
