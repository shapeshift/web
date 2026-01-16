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
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import qs from 'qs'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
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

export const YieldPositionCard = memo(
  ({ yieldItem, balances, isBalancesLoading }: YieldPositionCardProps) => {
    const translate = useTranslate()
    const navigate = useNavigate()
    const { location } = useBrowserRouter()
    const [searchParams] = useSearchParams()
    const validatorParam = searchParams.get('validator')

    const { chainId } = yieldItem
    const { accountId: contextAccountId, accountNumber } = useYieldAccount()

    const defaultValidator = chainId ? DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId] : undefined
    const selectedValidatorAddress = validatorParam || defaultValidator

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

    const hasEntering = useMemo(
      () => enteringBalance && bnOrZero(enteringBalance.aggregatedAmount).gt(0),
      [enteringBalance],
    )

    const exitingEntries = useMemo(() => {
      if (!balances?.raw) return []
      return balances.raw
        .filter(b => b.type === YieldBalanceType.Exiting && bnOrZero(b.amount).gt(0))
        .filter(b => {
          if (!selectedValidatorAddress) return true
          return b.validator?.address === selectedValidatorAddress
        })
    }, [balances?.raw, selectedValidatorAddress])

    const hasExiting = useMemo(() => exitingEntries.length > 0, [exitingEntries])
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
      navigate({
        pathname: location.pathname,
        search: qs.stringify({
          action: 'claim',
          modal: 'yield',
          ...(selectedValidatorAddress ? { validator: selectedValidatorAddress } : {}),
        }),
      })
    }, [navigate, location.pathname, selectedValidatorAddress])

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

    const enteringSection = useMemo(() => {
      if (!hasEntering) return null
      return (
        <Alert status='warning' variant='subtle' borderRadius='lg' p={3}>
          <Flex justify='space-between' align='center' width='full'>
            <Box>
              <Text fontSize='xs' fontWeight='bold' textTransform='uppercase'>
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
        </Alert>
      )
    }, [hasEntering, translate, formatBalance, enteringBalance])

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
                  {translate('yieldXYZ.unstaking')}
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
    }, [hasExiting, exitingEntries, translate])

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

    if (!accountId) return null

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

    if (!hasAnyPosition && !showPendingActions) return null

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
          </VStack>
        </CardBody>
      </Card>
    )
  },
)
