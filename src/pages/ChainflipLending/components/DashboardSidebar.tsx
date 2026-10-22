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
import { RawText, Text } from '@/components/Text'
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

  const gaugeColor = useMemo(() => (percentUsed > 80 ? 'red.500' : 'blue.500'), [percentUsed])

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
            color={gaugeColor}
            trackColor='whiteAlpha.100'
          >
            <CircularProgressLabel fontSize='lg' fontWeight='bold' color={gaugeColor}>
              {Math.round(percentUsed)}%
            </CircularProgressLabel>
          </CircularProgress>
          <Stack spacing={0} alignItems='center'>
            <Text
              translation='chainflipLending.dashboard.available'
              fontSize='sm'
              color={gaugeColor}
            />
            <Amount.Fiat value={available} fontSize='lg' fontWeight='bold' color={gaugeColor} />
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  )
})

export const NextStepsArt = memo(({ colorScheme }: { colorScheme: 'green' | 'purple' }) => {
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

type NextStepsCardProps = {
  assetId?: AssetId
}

export const NextStepsCard = memo(({ assetId }: NextStepsCardProps) => {
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

  const targetAssetId = useMemo(() => assetId ?? LENDING_ASSET_IDS[0], [assetId])

  const handleSupply = useCallback(() => {
    if (targetAssetId) chainflipLendingModal.open({ mode: 'supply', assetId: targetAssetId })
  }, [chainflipLendingModal, targetAssetId])

  const handleAddCollateral = useCallback(() => {
    if (targetAssetId) chainflipLendingModal.open({ mode: 'addCollateral', assetId: targetAssetId })
  }, [chainflipLendingModal, targetAssetId])

  const handleBorrow = useCallback(() => {
    if (targetAssetId) chainflipLendingModal.open({ mode: 'borrow', assetId: targetAssetId })
  }, [chainflipLendingModal, targetAssetId])

  // Hide when user has completed all steps
  if (hasSupply && hasCollateral && hasLoans) return null

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
              fontSize='sm'
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
              fontSize='sm'
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

const VoluntaryLiquidationActiveCard = memo(() => {
  const translate = useTranslate()
  const { loanAccount, totalBorrowedFiat, totalCollateralFiat } = useChainflipLoanAccount()
  const chainflipLendingModal = useModal('chainflipLending')

  const isVoluntaryLiquidationActive = useMemo(() => {
    if (!loanAccount?.liquidation_status) return false
    const status = loanAccount.liquidation_status as Record<string, unknown>
    return status.liquidation_type === 'Voluntary'
  }, [loanAccount?.liquidation_status])

  const handleStopLiquidation = useCallback(() => {
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId)
      chainflipLendingModal.open({ mode: 'voluntaryLiquidation', assetId: firstAssetId })
  }, [chainflipLendingModal])

  if (!isVoluntaryLiquidationActive) return null

  return (
    <Card
      bg='rgba(255, 255, 255, 0.04)'
      borderWidth='1px'
      borderColor='rgba(255, 255, 255, 0.04)'
      borderRadius='2xl'
    >
      <CardBody p={6}>
        <Stack spacing={6}>
          <Flex alignItems='center' gap={2}>
            <CircularProgress
              isIndeterminate
              size='24px'
              color='blue.500'
              trackColor='transparent'
            />
            <RawText fontSize='sm' fontWeight='medium'>
              {translate('chainflipLending.dashboard.voluntaryLiquidationActive')}
            </RawText>
          </Flex>
          <Stack spacing={4}>
            <Flex justifyContent='space-between'>
              <RawText fontSize='sm' fontWeight='medium' color='rgba(255, 255, 255, 0.36)'>
                {translate('chainflipLending.dashboard.volLiqMethod')}
              </RawText>
              <RawText fontSize='sm' fontWeight='medium'>
                {translate('chainflipLending.dashboard.volLiqMethodValue')}
              </RawText>
            </Flex>
            <Flex justifyContent='space-between'>
              <RawText fontSize='sm' fontWeight='medium' color='rgba(255, 255, 255, 0.36)'>
                {translate('chainflipLending.dashboard.volLiqRemainingDebt')}
              </RawText>
              <Amount.Fiat value={totalBorrowedFiat} fontSize='sm' fontWeight='medium' />
            </Flex>
            <Flex justifyContent='space-between'>
              <RawText fontSize='sm' fontWeight='medium' color='rgba(255, 255, 255, 0.36)'>
                {translate('chainflipLending.dashboard.volLiqCollateralSold')}
              </RawText>
              <Amount.Fiat value={totalCollateralFiat} fontSize='sm' fontWeight='medium' />
            </Flex>
          </Stack>
          <RawText fontSize='sm' fontWeight='medium' color='rgba(255, 255, 255, 0.36)'>
            {translate('chainflipLending.dashboard.volLiqDescription')}
          </RawText>
          <Button
            variant='ghost'
            bg='rgba(255, 255, 255, 0.04)'
            width='full'
            height={10}
            borderRadius='xl'
            fontWeight='semibold'
            onClick={handleStopLiquidation}
          >
            {translate('chainflipLending.dashboard.volLiqStop')}
          </Button>
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
        <VoluntaryLiquidationActiveCard />
        <NextStepsCard />
      </Stack>
    </Box>
  )
})
