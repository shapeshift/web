import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
  Alert,
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
  VStack,
} from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import qs from 'qs'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { Display } from '@/components/Display'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import { getYieldActionLabelKeys, getYieldPendingStatusKeys } from '@/lib/yieldxyz/utils'
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

const enterIcon = <ArrowUpIcon />
const exitIcon = <ArrowDownIcon />

const loadingState = (
  <VStack align='stretch' spacing={4}>
    <Skeleton height='60px' />
    <Skeleton height='40px' />
  </VStack>
)

type YieldPositionCardProps = {
  yieldItem: AugmentedYieldDto
  balances: NormalizedYieldBalances | undefined
  isBalancesLoading: boolean
  selectedValidatorAddress: string | undefined
}

export const YieldPositionCard = memo(
  ({
    yieldItem,
    balances,
    isBalancesLoading,
    selectedValidatorAddress,
  }: YieldPositionCardProps) => {
    const translate = useTranslate()
    const navigate = useNavigate()
    const { location } = useBrowserRouter()
    const { dispatch: walletDispatch } = useWallet()

    const handleConnectWallet = useCallback(
      () => walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
      [walletDispatch],
    )

    const { chainId } = yieldItem
    const { accountId: contextAccountId, accountNumber } = useYieldAccount()

    const accountId = useAppSelector(state => {
      if (contextAccountId) return contextAccountId
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

    const hasEntering = Boolean(enteringBalance && bnOrZero(enteringBalance.aggregatedAmount).gt(0))

    const exitingEntries = useMemo(() => {
      if (!balances?.raw) return []
      return balances.raw
        .filter(b => b.type === YieldBalanceType.Exiting && bnOrZero(b.amount).gt(0))
        .filter(b => {
          if (!selectedValidatorAddress) return true
          return b.validator?.address === selectedValidatorAddress
        })
    }, [balances?.raw, selectedValidatorAddress])

    const hasExiting = exitingEntries.length > 0
    const hasWithdrawable = Boolean(
      withdrawableBalance && bnOrZero(withdrawableBalance.aggregatedAmount).gt(0),
    )
    const hasClaimable = Boolean(
      claimableBalance && bnOrZero(claimableBalance.aggregatedAmount).gt(0),
    )

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

    const hasAnyPosition = totalAmount.gt(0)

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

    const headingText = selectedValidatorName
      ? translate('yieldXYZ.myValidatorPosition', { validator: selectedValidatorName })
      : translate('yieldXYZ.myPosition')

    const addressBadgeText = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : ''

    const totalAmountFixed = totalAmount.toFixed()

    const navigateToAction = useCallback(
      (action: 'claim' | 'enter' | 'exit') => {
        navigate({
          pathname: location.pathname,
          search: qs.stringify({
            action,
            modal: 'yield',
            ...(selectedValidatorAddress ? { validator: selectedValidatorAddress } : {}),
          }),
        })
      },
      [navigate, location.pathname, selectedValidatorAddress],
    )

    const handleClaimClick = useCallback(() => navigateToAction('claim'), [navigateToAction])
    const handleEnter = useCallback(() => navigateToAction('enter'), [navigateToAction])
    const handleExit = useCallback(() => navigateToAction('exit'), [navigateToAction])

    const actionLabelKeys = getYieldActionLabelKeys(yieldItem.mechanics.type)
    const pendingStatusKeys = getYieldPendingStatusKeys(yieldItem.mechanics.type)
    const enterLabel = translate(actionLabelKeys.enter)
    const exitLabel = translate(actionLabelKeys.exit)

    const showPendingActions = hasEntering || hasExiting || hasWithdrawable || hasClaimable

    const enteringSection = useMemo(() => {
      if (!hasEntering) return null
      return (
        <Alert status='warning' variant='subtle' borderRadius='lg' p={3}>
          <Flex justify='space-between' align='center' width='full'>
            <Box>
              <Text fontSize='xs' fontWeight='bold' textTransform='uppercase'>
                {translate(pendingStatusKeys.enter)}
              </Text>
              <Text fontSize='sm' fontWeight='bold'>
                {formatBalance(enteringBalance)}
              </Text>
            </Box>
            <Badge colorScheme='yellow' variant='solid' fontSize='xs'>
              {translate('yieldXYZ.pending')}
            </Badge>
          </Flex>
        </Alert>
      )
    }, [hasEntering, translate, formatBalance, enteringBalance, pendingStatusKeys.enter])

    const unstakingSection = useMemo(() => {
      if (!hasExiting) return null

      return exitingEntries.map((entry, index) => {
        const completionDate = entry.date ? dayjs(entry.date) : null
        const availableDateText = completionDate ? dayjs().to(completionDate) : null

        return (
          <Alert
            key={`${entry.address}-${index}`}
            status='warning'
            variant='subtle'
            borderRadius='lg'
            p={3}
          >
            <Flex justify='space-between' align='center' width='full'>
              <Box>
                <Text fontSize='xs' fontWeight='bold' textTransform='uppercase'>
                  {translate(pendingStatusKeys.exit)}
                </Text>
                <Text fontSize='sm' fontWeight='bold'>
                  <Amount.Crypto value={entry.amount} symbol={entry.token.symbol} abbreviated />
                </Text>
              </Box>
              <VStack spacing={1} alignItems='flex-end'>
                <Badge colorScheme='orange' variant='solid' fontSize='xs'>
                  {translate('yieldXYZ.pending')}
                </Badge>
                {availableDateText && (
                  <Text fontSize='xs' color='text.subtle'>
                    {translate('yieldXYZ.availableDate', { date: availableDateText })}
                  </Text>
                )}
              </VStack>
            </Flex>
          </Alert>
        )
      })
    }, [hasExiting, exitingEntries, translate, pendingStatusKeys.exit])

    const withdrawableSection = useMemo(() => {
      if (!hasWithdrawable) return null
      return (
        <Alert status='success' variant='subtle' borderRadius='lg' p={3}>
          <Flex justify='space-between' align='center' width='full'>
            <Box>
              <Text fontSize='xs' fontWeight='bold' textTransform='uppercase'>
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
        </Alert>
      )
    }, [hasWithdrawable, translate, formatBalance, withdrawableBalance])

    const claimableSection = useMemo(() => {
      if (!hasClaimable) return null
      return (
        <Alert status='info' variant='subtle' borderRadius='lg' p={3}>
          <Flex justify='space-between' align='center' width='full'>
            <Box>
              <Text fontSize='xs' fontWeight='bold' textTransform='uppercase'>
                {translate('yieldXYZ.claimable')}
              </Text>
              <Text fontSize='sm' fontWeight='bold'>
                {formatBalance(claimableBalance)}
              </Text>
            </Box>
            <VStack spacing={1} alignItems='flex-end'>
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
            </VStack>
          </Flex>
        </Alert>
      )
    }, [
      hasClaimable,
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
        <Badge variant='subtle' colorScheme='blue' borderRadius='full' px={2} py={0.5}>
          {addressBadgeText}
        </Badge>
      )
    }, [address, addressBadgeText])

    const pendingActionsSection = useMemo(() => {
      if (!showPendingActions) return null
      return (
        <>
          <Divider borderColor='border.base' />
          <VStack spacing={3} align='stretch'>
            {enteringSection}
            {unstakingSection}
            {withdrawableSection}
            {claimableSection}
          </VStack>
        </>
      )
    }, [
      showPendingActions,
      enteringSection,
      unstakingSection,
      withdrawableSection,
      claimableSection,
    ])

    if (!accountId) {
      return (
        <Card variant='dashboard'>
          <CardBody p={{ base: 4, md: 5 }}>
            <Flex justifyContent='space-between' alignItems='center' mb={4}>
              <Heading
                as='h3'
                size='sm'
                textTransform='uppercase'
                color='text.subtle'
                letterSpacing='wider'
              >
                {translate('yieldXYZ.myPosition')}
              </Heading>
            </Flex>
            <VStack spacing={4} align='stretch'>
              <Box>
                <Text fontSize='xs' color='text.subtle' mb={1} textTransform='uppercase'>
                  {translate('yieldXYZ.totalValue')}
                </Text>
                <Text fontSize='3xl' fontWeight='800' lineHeight='1'>
                  <Amount.Fiat value='0' />
                </Text>
                <Text fontSize='sm' color='text.subtle' mt={1}>
                  <Amount.Crypto value='0' symbol={yieldItem.token.symbol} abbreviated />
                </Text>
              </Box>
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
            </VStack>
          </CardBody>
        </Card>
      )
    }

    if (isBalancesLoading) {
      return (
        <Card variant='dashboard'>
          <CardBody p={{ base: 4, md: 5 }}>
            <Flex justifyContent='space-between' alignItems='center' mb={4}>
              <Heading
                as='h3'
                size='sm'
                textTransform='uppercase'
                color='text.subtle'
                letterSpacing='wider'
              >
                {translate('yieldXYZ.myPosition')}
              </Heading>
            </Flex>
            {loadingState}
          </CardBody>
        </Card>
      )
    }

    return (
      <Card variant='dashboard'>
        <CardBody p={{ base: 4, md: 5 }}>
          <Flex justifyContent='space-between' alignItems='center' mb={4}>
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
          <VStack spacing={4} align='stretch'>
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
            {pendingActionsSection}
            <Display.Desktop>
              <HStack spacing={3} pt={2}>
                <Button
                  leftIcon={enterIcon}
                  colorScheme='blue'
                  size='lg'
                  height={12}
                  borderRadius='xl'
                  onClick={handleEnter}
                  flex={1}
                  fontWeight='bold'
                >
                  {enterLabel}
                </Button>
                {hasAnyPosition && (
                  <Button
                    leftIcon={exitIcon}
                    variant='outline'
                    size='lg'
                    height={12}
                    borderRadius='xl'
                    onClick={handleExit}
                    flex={1}
                    fontWeight='bold'
                  >
                    {exitLabel}
                  </Button>
                )}
              </HStack>
            </Display.Desktop>
          </VStack>
        </CardBody>
      </Card>
    )
  },
)
