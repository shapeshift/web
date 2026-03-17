import {
  Box,
  Button,
  Card,
  CardBody,
  Center,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  Icon,
  Stack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { TbRefresh, TbSparkles } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Text } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipFreeBalances } from '@/pages/ChainflipLending/hooks/useChainflipFreeBalances'
import { useChainflipLoanAccount } from '@/pages/ChainflipLending/hooks/useChainflipLoanAccount'
import { useChainflipLtvThresholds } from '@/pages/ChainflipLending/hooks/useChainflipLtvThresholds'
import { useChainflipSupplyPositions } from '@/pages/ChainflipLending/hooks/useChainflipSupplyPositions'

const LENDING_ASSET_IDS = Object.keys(CHAINFLIP_LENDING_ASSET_BY_ASSET_ID) as AssetId[]

const sidebarPosition = { base: 'relative' as const, lg: 'sticky' as const }
const sidebarTop = { base: 0, lg: 4 }

export const BorrowingPowerCard = memo(() => {
  const translate = useTranslate()
  const { totalCollateralFiat, totalBorrowedFiat } = useChainflipLoanAccount()
  const { thresholds } = useChainflipLtvThresholds()

  const hasCollateral = useMemo(() => bnOrZero(totalCollateralFiat).gt(0), [totalCollateralFiat])

  const targetLtv = thresholds?.target ?? 0.5

  const maxBorrow = useMemo(
    () => bnOrZero(totalCollateralFiat).times(targetLtv).toFixed(2),
    [totalCollateralFiat, targetLtv],
  )

  const available = useMemo(
    () => bnOrZero(maxBorrow).minus(totalBorrowedFiat).toFixed(2),
    [maxBorrow, totalBorrowedFiat],
  )

  const percentUsed = useMemo(() => {
    if (bnOrZero(maxBorrow).isZero()) return 0
    return bnOrZero(totalBorrowedFiat).div(maxBorrow).times(100).toNumber()
  }, [totalBorrowedFiat, maxBorrow])

  if (!hasCollateral) return null

  return (
    <Card data-testid='chainflip-lending-borrowing-power'>
      <CardBody>
        <Stack spacing={4} alignItems='center'>
          <HelperTooltip label={translate('chainflipLending.dashboard.borrowingPowerTooltip')}>
            <Text
              translation='chainflipLending.dashboard.borrowingPower'
              fontWeight='bold'
              fontSize='md'
            />
          </HelperTooltip>
          <CircularProgress
            value={percentUsed}
            size='120px'
            thickness='8px'
            color={percentUsed > 80 ? 'red.500' : percentUsed > 50 ? 'yellow.500' : 'green.500'}
            trackColor='whiteAlpha.100'
          >
            <CircularProgressLabel fontSize='lg' fontWeight='bold'>
              {Math.round(percentUsed)}%
            </CircularProgressLabel>
          </CircularProgress>
          <Stack spacing={0} alignItems='center'>
            <Text
              translation='chainflipLending.dashboard.available'
              fontSize='sm'
              color='text.subtle'
            />
            <Amount.Fiat value={available} fontSize='lg' fontWeight='bold' color='green.500' />
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  )
})

const NextStepsArt = memo(({ colorScheme }: { colorScheme: 'green' | 'purple' }) => {
  const isGreen = colorScheme === 'green'
  const ringColor = isGreen ? 'green.500' : 'purple.500'
  const bgColor = isGreen ? 'rgba(0, 205, 152, 0.05)' : 'rgba(128, 90, 213, 0.05)'
  const iconColor = isGreen ? 'green.500' : 'purple.500'

  return (
    <Center position='relative' height='120px' overflow='hidden'>
      {/* Outer decorative rings */}
      <Box
        position='absolute'
        width='200px'
        height='200px'
        borderRadius='full'
        border='1px solid'
        borderColor={ringColor}
        opacity={0.15}
      />
      <Box
        position='absolute'
        width='160px'
        height='160px'
        borderRadius='full'
        border='1px solid'
        borderColor={ringColor}
        opacity={0.2}
      />
      <Box
        position='absolute'
        width='120px'
        height='120px'
        borderRadius='full'
        border='1px solid'
        borderColor={ringColor}
        opacity={0.3}
      />
      {/* Center circle with icon */}
      <Center
        width='64px'
        height='64px'
        borderRadius='full'
        bg={bgColor}
        boxShadow={`inset 0 1px 0 0 ${
          isGreen ? 'rgba(0, 205, 152, 0.25)' : 'rgba(128, 90, 213, 0.25)'
        }`}
      >
        <Icon as={isGreen ? TbSparkles : TbRefresh} boxSize={6} color={iconColor} />
      </Center>
    </Center>
  )
})

export const NextStepsCard = memo(() => {
  const translate = useTranslate()
  const chainflipLendingModal = useModal('chainflipLending')
  const { freeBalances } = useChainflipFreeBalances()
  const { supplyPositions } = useChainflipSupplyPositions()
  const { collateralWithFiat, loansWithFiat } = useChainflipLoanAccount()

  const hasFreeBalance = useMemo(
    () => freeBalances.some(b => b.assetId && bnOrZero(b.balanceCryptoPrecision).gt(0)),
    [freeBalances],
  )

  const hasSupply = supplyPositions.length > 0
  const hasCollateral = collateralWithFiat.length > 0
  const hasLoans = loansWithFiat.length > 0

  const handleSupply = useCallback(() => {
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId) chainflipLendingModal.open({ mode: 'supply', assetId: firstAssetId })
  }, [chainflipLendingModal])

  const handleAddCollateral = useCallback(() => {
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId) chainflipLendingModal.open({ mode: 'addCollateral', assetId: firstAssetId })
  }, [chainflipLendingModal])

  const handleBorrow = useCallback(() => {
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId) chainflipLendingModal.open({ mode: 'borrow', assetId: firstAssetId })
  }, [chainflipLendingModal])

  // Hide when user has everything or no free balance
  if (!hasFreeBalance || (hasSupply && hasCollateral && hasLoans)) return null

  const getContent = () => {
    if (hasFreeBalance && !hasSupply && !hasCollateral) {
      return {
        colorScheme: 'green' as const,
        descriptionKey: 'chainflipLending.dashboard.nextStepsSupplyOrCollateral',
        actions: (
          <Flex gap={2}>
            <Button flex={1} colorScheme='blue' onClick={handleSupply}>
              {translate('chainflipLending.dashboard.supply')}
            </Button>
            <Button flex={1} variant='outline' onClick={handleAddCollateral}>
              {translate('chainflipLending.dashboard.addCollateral')}
            </Button>
          </Flex>
        ),
      }
    }

    if (hasSupply && !hasCollateral) {
      return {
        colorScheme: 'green' as const,
        descriptionKey: 'chainflipLending.dashboard.nextStepsCollateral',
        actions: (
          <Button width='full' colorScheme='blue' onClick={handleAddCollateral}>
            {translate('chainflipLending.dashboard.addCollateral')}
          </Button>
        ),
      }
    }

    if (hasCollateral && !hasLoans) {
      return {
        colorScheme: 'purple' as const,
        descriptionKey: 'chainflipLending.dashboard.nextStepsBorrow',
        actions: (
          <Button width='full' colorScheme='blue' onClick={handleBorrow}>
            {translate('chainflipLending.dashboard.borrow')}
          </Button>
        ),
      }
    }

    return null
  }

  const content = getContent()
  if (!content) return null

  return (
    <Card overflow='hidden' data-testid='chainflip-lending-next-steps'>
      <CardBody pt={0}>
        <Stack spacing={4}>
          <NextStepsArt colorScheme={content.colorScheme} />
          <Text
            translation='chainflipLending.dashboard.yourNextSteps'
            fontWeight='bold'
            fontSize='md'
          />
          <Text translation={content.descriptionKey} color='text.subtle' fontSize='sm' />
          {content.actions}
        </Stack>
      </CardBody>
    </Card>
  )
})

export const DashboardSidebar = memo(() => {
  return (
    <Box
      position={sidebarPosition}
      top={sidebarTop}
      width={{ base: 'full', lg: '300px' }}
      flexShrink={0}
    >
      <Stack spacing={4}>
        <BorrowingPowerCard />
        <NextStepsCard />
      </Stack>
    </Box>
  )
})
