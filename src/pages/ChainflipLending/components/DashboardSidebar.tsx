import {
  Box,
  Button,
  Card,
  CardBody,
  Center,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  Stack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import borrowGlow from '@/assets/chainflip-lending/borrow-glow.svg'
import borrowRing1 from '@/assets/chainflip-lending/borrow-ring-1.svg'
import borrowRingInner from '@/assets/chainflip-lending/borrow-ring-inner.svg'
import earnGlow from '@/assets/chainflip-lending/earn-glow.svg'
import earnRingInner from '@/assets/chainflip-lending/earn-ring-inner.svg'
import earnRingMiddle from '@/assets/chainflip-lending/earn-ring-middle.svg'
import earnRingOuter from '@/assets/chainflip-lending/earn-ring-outer.svg'
import refreshIcon from '@/assets/chainflip-lending/refresh-icon.svg'
import sparklesIcon from '@/assets/chainflip-lending/sparkles-icon.svg'
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

  return (
    <Center position='relative' height='140px' overflow='hidden'>
      {isGreen ? (
        <>
          <Box
            as='img'
            src={earnGlow}
            position='absolute'
            top='-60px'
            width='339px'
            height='339px'
          />
          <Box as='img' src={earnRingOuter} position='absolute' width='180px' height='180px' />
          <Box as='img' src={earnRingMiddle} position='absolute' width='150px' height='150px' />
          <Box as='img' src={earnRingInner} position='absolute' width='110px' height='110px' />
          <Center
            position='absolute'
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
          <Box
            as='img'
            src={borrowGlow}
            position='absolute'
            top='-50px'
            width='304px'
            height='304px'
          />
          <Box
            as='img'
            src={borrowRing1}
            position='absolute'
            width='160px'
            height='160px'
            transform='rotate(45deg)'
          />
          <Box
            as='img'
            src={borrowRingInner}
            position='absolute'
            width='110px'
            height='110px'
            transform='rotate(45deg)'
          />
          <Center
            position='absolute'
            width='64px'
            height='64px'
            borderRadius='full'
            bg='rgba(128, 90, 213, 0.1)'
            borderWidth='1px'
            borderColor='blue.500'
          >
            <Box as='img' src={refreshIcon} width='28px' height='28px' />
          </Center>
        </>
      )}
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
            <Button
              flex={1}
              colorScheme='blue'
              height='40px'
              borderRadius='xl'
              fontWeight='semibold'
              onClick={handleSupply}
            >
              {translate('chainflipLending.dashboard.supply')}
            </Button>
            <Button
              flex={1}
              variant='outline'
              height='40px'
              borderRadius='xl'
              fontWeight='semibold'
              bg='whiteAlpha.50'
              onClick={handleAddCollateral}
            >
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
          <Button
            width='full'
            colorScheme='blue'
            height='40px'
            borderRadius='xl'
            fontWeight='semibold'
            onClick={handleAddCollateral}
          >
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
          <Button
            width='full'
            colorScheme='blue'
            height='40px'
            borderRadius='xl'
            fontWeight='semibold'
            onClick={handleBorrow}
          >
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
        <Stack spacing={5}>
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
