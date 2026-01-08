import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  HStack,
  Skeleton,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSearchParams } from 'react-router-dom'

import { YieldActionModal } from './YieldActionModal'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import { useYieldAccount } from '@/pages/Yields/YieldAccountContext'
import type {
  AggregatedBalance,
  NormalizedYieldBalances,
} from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectUserCurrencyToUsdRate,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldPositionCardProps = {
  yieldItem: AugmentedYieldDto
  balances: NormalizedYieldBalances | undefined
  isBalancesLoading: boolean
}

type ClaimModalData = {
  amount: string
  assetSymbol: string
  assetLogoURI: string | undefined
  validatorAddress: string | undefined
  validatorName: string | undefined
  validatorLogoURI: string | undefined
  passthrough: string | undefined
  manageActionType: string | undefined
}

export const YieldPositionCard = memo(
  ({ yieldItem, balances, isBalancesLoading }: YieldPositionCardProps) => {
    const [claimModalData, setClaimModalData] = useState<ClaimModalData | null>(null)
    const translate = useTranslate()
    const cardBg = useColorModeValue('white', 'gray.800')
    const borderColor = useColorModeValue('gray.100', 'gray.750')
    const badgeBg = useColorModeValue('blue.50', 'blue.900')
    const badgeColor = useColorModeValue('blue.700', 'blue.200')
    const emptyStateBg = useColorModeValue('blue.50', 'blue.900')
    const emptyStateBorderColor = useColorModeValue('blue.200', 'blue.800')
    const emptyStateTitleColor = useColorModeValue('blue.700', 'blue.100')
    const emptyStateTextColor = useColorModeValue('blue.600', 'blue.200')
    const enteringBg = useColorModeValue('yellow.50', 'yellow.900')
    const enteringBorderColor = useColorModeValue('yellow.300', 'yellow.700')
    const enteringTextColor = useColorModeValue('yellow.700', 'yellow.300')
    const exitingBg = useColorModeValue('orange.50', 'orange.900')
    const exitingBorderColor = useColorModeValue('orange.300', 'orange.700')
    const exitingTextColor = useColorModeValue('orange.700', 'orange.300')
    const withdrawableBg = useColorModeValue('green.50', 'green.900')
    const withdrawableBorderColor = useColorModeValue('green.300', 'green.700')
    const withdrawableTextColor = useColorModeValue('green.700', 'green.300')
    const claimableBg = useColorModeValue('purple.50', 'purple.900')
    const claimableBorderColor = useColorModeValue('purple.300', 'purple.700')
    const claimableTextColor = useColorModeValue('purple.700', 'purple.300')
    const [searchParams] = useSearchParams()
    const validatorParam = searchParams.get('validator')

    const { chainId } = yieldItem
    const { accountNumber } = useYieldAccount()

    const defaultValidator = chainId ? DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId] : undefined
    const selectedValidatorAddress = validatorParam || defaultValidator

    const accountId = useAppSelector(state => {
      if (!chainId) return undefined
      const accountIdsByNumberAndChain = selectAccountIdByAccountNumberAndChainId(state)
      return accountIdsByNumberAndChain[accountNumber]?.[chainId]
    })
    const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

    const address = useMemo(
      () => (accountId ? fromAccountId(accountId).account : undefined),
      [accountId],
    )

    const balancesByType = useMemo(() => {
      if (!balances) return undefined
      if (selectedValidatorAddress && balances.byValidatorAddress[selectedValidatorAddress])
        return balances.byValidatorAddress[selectedValidatorAddress]
      return balances.byType
    }, [balances, selectedValidatorAddress])

    const activeBalance = balancesByType?.[YieldBalanceType.Active]
    const enteringBalance = balancesByType?.[YieldBalanceType.Entering]
    const exitingBalance = balancesByType?.[YieldBalanceType.Exiting]
    const withdrawableBalance = balancesByType?.[YieldBalanceType.Withdrawable]
    const claimableBalance = balancesByType?.[YieldBalanceType.Claimable]

    const claimAction = useMemo(
      () =>
        claimableBalance?.pendingActions?.find(action =>
          action.type.toUpperCase().includes('CLAIM'),
        ),
      [claimableBalance],
    )

    const canClaim = useMemo(
      () => Boolean(claimAction && bnOrZero(claimableBalance?.aggregatedAmount).gt(0)),
      [claimAction, claimableBalance?.aggregatedAmount],
    )

    const formatBalance = useCallback((balance: AggregatedBalance | undefined) => {
      if (!balance) return '0'
      return (
        <Amount.Crypto value={balance.aggregatedAmount} symbol={balance.token.symbol} abbreviated />
      )
    }, [])

    const hasEntering = useMemo(
      () => enteringBalance && bnOrZero(enteringBalance.aggregatedAmount).gt(0),
      [enteringBalance],
    )
    const hasExiting = useMemo(
      () => exitingBalance && bnOrZero(exitingBalance.aggregatedAmount).gt(0),
      [exitingBalance],
    )
    const hasWithdrawable = useMemo(
      () => withdrawableBalance && bnOrZero(withdrawableBalance.aggregatedAmount).gt(0),
      [withdrawableBalance],
    )
    const hasClaimable = useMemo(() => Boolean(claimableBalance), [claimableBalance])

    const totalValueUsd = useMemo(
      () =>
        [activeBalance, enteringBalance, exitingBalance, withdrawableBalance].reduce(
          (sum, b) => sum.plus(bnOrZero(b?.aggregatedAmountUsd)),
          bnOrZero(0),
        ),
      [activeBalance, enteringBalance, exitingBalance, withdrawableBalance],
    )

    const totalValueUserCurrency = useMemo(
      () => totalValueUsd.times(userCurrencyToUsdRate).toFixed(),
      [totalValueUsd, userCurrencyToUsdRate],
    )

    const totalAmount = useMemo(
      () =>
        [activeBalance, enteringBalance, exitingBalance, withdrawableBalance].reduce(
          (sum, b) => sum.plus(bnOrZero(b?.aggregatedAmount)),
          bnOrZero(0),
        ),
      [activeBalance, enteringBalance, exitingBalance, withdrawableBalance],
    )

    const hasAnyPosition = useMemo(() => totalAmount.gt(0), [totalAmount])

    const { data: validators } = useYieldValidators(yieldItem.id)

    const selectedValidatorName = useMemo(() => {
      if (!selectedValidatorAddress) return undefined
      const found = validators?.find(v => v.address === selectedValidatorAddress)
      if (found) return found.name
      const foundInBalances = balances?.raw.find(
        b => b.validator?.address === selectedValidatorAddress,
      )
      return foundInBalances?.validator?.name
    }, [validators, selectedValidatorAddress, balances])

    const headingText = useMemo(
      () =>
        selectedValidatorName
          ? translate('yieldXYZ.myValidatorPosition', { validator: selectedValidatorName })
          : translate('yieldXYZ.myPosition'),
      [selectedValidatorName, translate],
    )

    const addressBadgeText = useMemo(
      () => (address ? `${address.slice(0, 4)}...${address.slice(-4)}` : ''),
      [address],
    )

    const totalAmountFixed = useMemo(() => totalAmount.toFixed(), [totalAmount])

    const handleClaimClick = useCallback(() => {
      setClaimModalData({
        amount: claimableBalance?.amount ?? '0',
        assetSymbol: claimableBalance?.token.symbol ?? '',
        assetLogoURI: claimableBalance?.token.logoURI,
        validatorAddress: selectedValidatorAddress,
        validatorName: claimableBalance?.validator?.name,
        validatorLogoURI: claimableBalance?.validator?.logoURI,
        passthrough: claimAction?.passthrough,
        manageActionType: claimAction?.type,
      })
    }, [claimableBalance, selectedValidatorAddress, claimAction])

    const handleClaimClose = useCallback(() => setClaimModalData(null), [])

    const showPendingActions = useMemo(
      () => hasEntering || hasExiting || hasWithdrawable || hasClaimable,
      [hasEntering, hasExiting, hasWithdrawable, hasClaimable],
    )

    const loadingState = useMemo(
      () => (
        <VStack align='stretch' spacing={4}>
          <Skeleton height='60px' />
          <Skeleton height='40px' />
        </VStack>
      ),
      [],
    )

    const emptyStateAlert = useMemo(
      () => (
        <Alert
          status='info'
          variant='subtle'
          borderRadius='lg'
          flexDirection='column'
          alignItems='start'
          p={4}
          bg={emptyStateBg}
          borderColor={emptyStateBorderColor}
          border='1px solid'
        >
          <Flex alignItems='center' gap={2} mb={1}>
            <AlertIcon boxSize='20px' color={emptyStateTextColor} mr={0} />
            <Text fontWeight='bold' color={emptyStateTitleColor}>
              {translate('yieldXYZ.startEarning')}
            </Text>
          </Flex>
          <Text fontSize='sm' color={emptyStateTextColor}>
            {translate('yieldXYZ.depositYourToken', { symbol: yieldItem.token.symbol })}
          </Text>
        </Alert>
      ),
      [
        emptyStateBg,
        emptyStateBorderColor,
        emptyStateTextColor,
        emptyStateTitleColor,
        yieldItem.token.symbol,
        translate,
      ],
    )

    const enteringSection = useMemo(() => {
      if (!hasEntering) return null
      return (
        <Flex
          justify='space-between'
          align='center'
          p={3}
          bg={enteringBg}
          borderRadius='lg'
          border='1px solid'
          borderColor={enteringBorderColor}
        >
          <Box>
            <Text
              fontSize='xs'
              fontWeight='bold'
              color={enteringTextColor}
              textTransform='uppercase'
            >
              {translate('yieldXYZ.entering')}
            </Text>
            <Text fontSize='sm' fontWeight='bold'>
              {formatBalance(enteringBalance)}
            </Text>
          </Box>
          <Badge colorScheme='yellow' variant='solid' fontSize='xs'>
            {translate('yieldXYZ.pending')}
          </Badge>
        </Flex>
      )
    }, [
      hasEntering,
      enteringBg,
      enteringBorderColor,
      enteringTextColor,
      translate,
      formatBalance,
      enteringBalance,
    ])

    const exitingSection = useMemo(() => {
      if (!hasExiting) return null
      return (
        <Flex
          justify='space-between'
          align='center'
          p={3}
          bg={exitingBg}
          borderRadius='lg'
          border='1px solid'
          borderColor={exitingBorderColor}
        >
          <Box>
            <Text
              fontSize='xs'
              fontWeight='bold'
              color={exitingTextColor}
              textTransform='uppercase'
            >
              {translate('yieldXYZ.exiting')}
            </Text>
            <Text fontSize='sm' fontWeight='bold'>
              {formatBalance(exitingBalance)}
            </Text>
          </Box>
          <Badge colorScheme='orange' variant='solid' fontSize='xs'>
            Pending
          </Badge>
        </Flex>
      )
    }, [
      hasExiting,
      exitingBg,
      exitingBorderColor,
      exitingTextColor,
      translate,
      formatBalance,
      exitingBalance,
    ])

    const withdrawableSection = useMemo(() => {
      if (!hasWithdrawable) return null
      return (
        <Flex
          justify='space-between'
          align='center'
          p={3}
          bg={withdrawableBg}
          borderRadius='lg'
          border='1px solid'
          borderColor={withdrawableBorderColor}
        >
          <Box>
            <Text
              fontSize='xs'
              fontWeight='bold'
              color={withdrawableTextColor}
              textTransform='uppercase'
            >
              {translate('yieldXYZ.withdrawable')}
            </Text>
            <Text fontSize='sm' fontWeight='bold'>
              {formatBalance(withdrawableBalance)}
            </Text>
          </Box>
          <Badge colorScheme='green' variant='solid' fontSize='xs'>
            {translate('yieldXYZ.ready')}
          </Badge>
        </Flex>
      )
    }, [
      hasWithdrawable,
      withdrawableBg,
      withdrawableBorderColor,
      withdrawableTextColor,
      translate,
      formatBalance,
      withdrawableBalance,
    ])

    const claimableSection = useMemo(() => {
      if (!hasClaimable) return null
      return (
        <Flex
          justify='space-between'
          align='center'
          p={3}
          bg={claimableBg}
          borderRadius='lg'
          border='1px solid'
          borderColor={claimableBorderColor}
        >
          <Box>
            <Text
              fontSize='xs'
              fontWeight='bold'
              color={claimableTextColor}
              textTransform='uppercase'
            >
              {translate('yieldXYZ.claimable')}
            </Text>
            <Text fontSize='sm' fontWeight='bold'>
              {formatBalance(claimableBalance)}
            </Text>
          </Box>
          <HStack spacing={2}>
            <Badge colorScheme='purple' variant='solid' fontSize='xs'>
              {translate('yieldXYZ.reward')}
            </Badge>
            {claimAction && (
              <Button
                size='xs'
                colorScheme='purple'
                variant='solid'
                onClick={handleClaimClick}
                isDisabled={!canClaim}
              >
                {translate('common.claim')}
              </Button>
            )}
          </HStack>
        </Flex>
      )
    }, [
      hasClaimable,
      claimableBg,
      claimableBorderColor,
      claimableTextColor,
      translate,
      formatBalance,
      claimableBalance,
      claimAction,
      handleClaimClick,
      canClaim,
    ])

    const addressBadge = useMemo(() => {
      if (!address) return null
      return (
        <Badge
          variant='subtle'
          colorScheme='blue'
          borderRadius='full'
          px={2}
          py={0.5}
          bg={badgeBg}
          color={badgeColor}
        >
          {addressBadgeText}
        </Badge>
      )
    }, [address, badgeBg, badgeColor, addressBadgeText])

    const pendingActionsSection = useMemo(() => {
      if (!showPendingActions) return null
      return (
        <>
          <Divider borderColor={borderColor} />
          <VStack spacing={3} align='stretch'>
            {enteringSection}
            {exitingSection}
            {withdrawableSection}
            {claimableSection}
          </VStack>
        </>
      )
    }, [
      showPendingActions,
      borderColor,
      enteringSection,
      exitingSection,
      withdrawableSection,
      claimableSection,
    ])

    if (isBalancesLoading) {
      return (
        <Card
          bg={cardBg}
          borderRadius='xl'
          shadow='sm'
          border='1px solid'
          borderColor={borderColor}
        >
          <CardBody p={6}>
            <Flex justifyContent='space-between' alignItems='center' mb={6}>
              <Heading
                as='h3'
                size='sm'
                textTransform='uppercase'
                color='text.subtle'
                letterSpacing='wider'
              >
                {headingText}
              </Heading>
              {addressBadge}
            </Flex>
            {loadingState}
          </CardBody>
        </Card>
      )
    }

    return (
      <Card bg={cardBg} borderRadius='xl' shadow='sm' border='1px solid' borderColor={borderColor}>
        <CardBody p={6}>
          <Flex justifyContent='space-between' alignItems='center' mb={6}>
            <Heading
              as='h3'
              size='sm'
              textTransform='uppercase'
              color='text.subtle'
              letterSpacing='wider'
            >
              {headingText}
            </Heading>
            {addressBadge}
          </Flex>
          <VStack spacing={6} align='stretch'>
            <Box>
              <Text fontSize='xs' color='text.subtle' mb={1} textTransform='uppercase'>
                {translate('yieldXYZ.totalValue')}
              </Text>
              <Text fontSize='3xl' fontWeight='800' lineHeight='1'>
                <Amount.Fiat value={totalValueUserCurrency} abbreviated />
              </Text>
              <Text fontSize='sm' color='text.subtle' mt={1}>
                <Amount.Crypto
                  value={totalAmountFixed}
                  symbol={yieldItem.token.symbol}
                  abbreviated
                />
              </Text>
            </Box>
            {!hasAnyPosition && emptyStateAlert}
            {pendingActionsSection}
            {claimModalData && (
              <YieldActionModal
                yieldItem={yieldItem}
                action='manage'
                isOpen={!!claimModalData}
                onClose={handleClaimClose}
                amount={claimModalData.amount}
                assetSymbol={claimModalData.assetSymbol}
                assetLogoURI={claimModalData.assetLogoURI}
                validatorAddress={claimModalData.validatorAddress}
                validatorName={claimModalData.validatorName}
                validatorLogoURI={claimModalData.validatorLogoURI}
                passthrough={claimModalData.passthrough}
                manageActionType={claimModalData.manageActionType}
              />
            )}
          </VStack>
        </CardBody>
      </Card>
    )
  },
)
