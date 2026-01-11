import {
  Avatar,
  Box,
  Button,
  Card,
  CardBody,
  Collapse,
  Divider,
  Flex,
  Heading,
  HStack,
  Skeleton,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSearchParams } from 'react-router-dom'

import { GradientApy } from './GradientApy'
import { YieldActionModal } from './YieldActionModal'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import { useYieldAccount } from '@/pages/Yields/YieldAccountContext'
import type {
  AggregatedBalance,
  NormalizedYieldBalances,
  ValidatorSummary,
} from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectUserCurrencyToUsdRate,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ValidatorBreakdownProps = {
  yieldItem: AugmentedYieldDto
  balances: NormalizedYieldBalances | undefined
  isBalancesLoading: boolean
}

type ClaimModalData = {
  validatorAddress: string
  validatorName: string
  validatorLogoURI: string | undefined
  amount: string
  assetSymbol: string
  assetLogoURI: string | undefined
  passthrough: string
  manageActionType: string
}

type ValidatorCardProps = {
  validatorSummary: ValidatorSummary
  isSelected: boolean
  userCurrencyToUsdRate: string
  hoverBg: string
  onValidatorSwitch: (e: React.MouseEvent) => void
  onClaimClick: (e: React.MouseEvent) => void
  formatUnlockDate: (dateString: string | undefined) => string | null
}

type BalanceRowProps = {
  balance: AggregatedBalance | undefined
  hasBalance: boolean
  label: string
  bg?: string
  textColor?: string
  dateColor?: string
  valueColor?: string
  showDate?: boolean
  claimButton?: React.ReactNode
}

const BalanceRow: FC<BalanceRowProps> = memo(
  ({ balance, hasBalance, label, bg, textColor, valueColor, dateColor, showDate, claimButton }) => {
    const translate = useTranslate()
    const formatUnlockDate = useCallback((dateString: string | undefined) => {
      if (!dateString) return null
      const date = new Date(dateString)
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }, [])

    if (!balance || !hasBalance) return null

    const isStyledRow = !!bg

    if (isStyledRow) {
      return (
        <Flex justify='space-between' align='center' px={2} py={1} borderRadius='md' bg={bg}>
          {claimButton ? (
            <>
              <Box>
                <Text
                  fontSize='xs'
                  color={textColor}
                  fontWeight='semibold'
                  textTransform='uppercase'
                >
                  {translate(label)}
                </Text>
                <Text fontSize='sm' fontWeight='medium' color={valueColor}>
                  <Amount.Crypto
                    value={balance.aggregatedAmount}
                    symbol={balance.token.symbol}
                    abbreviated
                  />
                </Text>
              </Box>
              {claimButton}
            </>
          ) : (
            <>
              <HStack spacing={1}>
                <Text
                  fontSize='xs'
                  color={textColor}
                  fontWeight='semibold'
                  textTransform='uppercase'
                >
                  {translate(label)}
                </Text>
                {showDate && balance.date && (
                  <Text fontSize='xs' color={dateColor}>
                    ({formatUnlockDate(balance.date)})
                  </Text>
                )}
              </HStack>
              <Text fontSize='sm' fontWeight='medium' color={valueColor}>
                <Amount.Crypto
                  value={balance.aggregatedAmount}
                  symbol={balance.token.symbol}
                  abbreviated
                />
              </Text>
            </>
          )}
        </Flex>
      )
    }

    return (
      <Flex justify='space-between' align='center'>
        <Text fontSize='xs' color='text.subtle' textTransform='uppercase'>
          {translate(label)}
        </Text>
        <Text fontSize='sm' fontWeight='medium'>
          <Amount.Crypto
            value={balance.aggregatedAmount}
            symbol={balance.token.symbol}
            abbreviated
          />
        </Text>
      </Flex>
    )
  },
)

const ValidatorCard: FC<ValidatorCardProps> = memo(
  ({
    validatorSummary,
    isSelected,
    userCurrencyToUsdRate,
    hoverBg,
    onValidatorSwitch,
    onClaimClick,
  }) => {
    const translate = useTranslate()
    const enteringBg = useColorModeValue('blue.50', 'blue.900')
    const enteringTextColor = useColorModeValue('blue.700', 'blue.300')
    const enteringDateColor = useColorModeValue('blue.600', 'blue.400')
    const enteringValueColor = useColorModeValue('blue.800', 'blue.200')
    const exitingBg = useColorModeValue('orange.50', 'orange.900')
    const exitingTextColor = useColorModeValue('orange.700', 'orange.300')
    const exitingDateColor = useColorModeValue('orange.600', 'orange.400')
    const exitingValueColor = useColorModeValue('orange.800', 'orange.200')
    const claimableBg = useColorModeValue('purple.50', 'purple.900')
    const claimableTextColor = useColorModeValue('purple.700', 'purple.300')
    const claimableValueColor = useColorModeValue('purple.800', 'purple.200')

    const {
      validator,
      byType,
      totalUsd,
      hasActive,
      hasEntering,
      hasExiting,
      hasClaimable,
      claimAction,
    } = validatorSummary

    const activeBalance = byType[YieldBalanceType.Active]
    const enteringBalance = byType[YieldBalanceType.Entering]
    const exitingBalance = byType[YieldBalanceType.Exiting]
    const claimableBalance = byType[YieldBalanceType.Claimable]

    const claimButton = useMemo(
      () =>
        claimAction ? (
          <Button size='xs' colorScheme='purple' variant='solid' onClick={onClaimClick}>
            {translate('common.claim')}
          </Button>
        ) : null,
      [claimAction, onClaimClick, translate],
    )

    return (
      <Flex direction='column' gap={3} p={3} borderRadius='lg' bg={hoverBg} position='relative'>
        {!isSelected && (
          <Button
            size='xs'
            position='absolute'
            top={3}
            right={3}
            colorScheme='blue'
            variant='outline'
            onClick={onValidatorSwitch}
          >
            {translate('yieldXYZ.switch')}
          </Button>
        )}
        <HStack spacing={3}>
          <Avatar src={validator.logoURI} name={validator.name} size='sm' bg='gray.700' />
          <Box flex={1}>
            <Flex align='center' gap={2}>
              <Text fontWeight='semibold' fontSize='sm'>
                {validator.name}
              </Text>
              {validator.apr !== undefined && bnOrZero(validator.apr).gt(0) && (
                <GradientApy fontSize='xs'>
                  {bnOrZero(validator.apr).times(100).toFixed(2)}% APR
                </GradientApy>
              )}
            </Flex>
            <Text fontSize='xs' color='text.subtle'>
              <Amount.Fiat value={bnOrZero(totalUsd).times(userCurrencyToUsdRate).toFixed()} />
            </Text>
          </Box>
        </HStack>
        <VStack spacing={2} align='stretch' pl={10}>
          <BalanceRow balance={activeBalance} hasBalance={hasActive} label='yieldXYZ.staked' />
          <BalanceRow
            balance={enteringBalance}
            hasBalance={hasEntering}
            label='yieldXYZ.entering'
            bg={enteringBg}
            textColor={enteringTextColor}
            dateColor={enteringDateColor}
            valueColor={enteringValueColor}
            showDate
          />
          <BalanceRow
            balance={exitingBalance}
            hasBalance={hasExiting}
            label='yieldXYZ.exiting'
            bg={exitingBg}
            textColor={exitingTextColor}
            dateColor={exitingDateColor}
            valueColor={exitingValueColor}
            showDate
          />
          <BalanceRow
            balance={claimableBalance}
            hasBalance={hasClaimable}
            label='yieldXYZ.claimable'
            bg={claimableBg}
            textColor={claimableTextColor}
            valueColor={claimableValueColor}
            claimButton={claimButton}
          />
        </VStack>
      </Flex>
    )
  },
)

export const ValidatorBreakdown = memo(
  ({ yieldItem, balances, isBalancesLoading }: ValidatorBreakdownProps) => {
    const translate = useTranslate()
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true })
    const [claimModalData, setClaimModalData] = useState<ClaimModalData | null>(null)
    const handleClaimClose = useCallback(() => setClaimModalData(null), [])

    const cardBg = useColorModeValue('white', 'gray.800')
    const borderColor = useColorModeValue('gray.100', 'gray.750')
    const hoverBg = useColorModeValue('gray.50', 'gray.750')

    const { chainId } = yieldItem
    const { accountNumber } = useYieldAccount()
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

    const [searchParams, setSearchParams] = useSearchParams()
    const selectedValidator = useMemo(() => searchParams.get('validator'), [searchParams])

    const requiresValidatorSelection = useMemo(
      () => yieldItem.mechanics.requiresValidatorSelection,
      [yieldItem.mechanics.requiresValidatorSelection],
    )

    const validators = useMemo(
      () => (requiresValidatorSelection ? balances?.validators ?? [] : []),
      [balances?.validators, requiresValidatorSelection],
    )

    const hasValidatorPositions = useMemo(
      () => (requiresValidatorSelection ? balances?.hasValidatorPositions ?? false : false),
      [balances?.hasValidatorPositions, requiresValidatorSelection],
    )

    const allPositionsTotalUserCurrency = useMemo(
      () =>
        bnOrZero(balances?.totalUsd)
          .times(userCurrencyToUsdRate)
          .toFixed(),
      [balances?.totalUsd, userCurrencyToUsdRate],
    )

    const formatUnlockDate = useCallback((dateString: string | undefined) => {
      if (!dateString) return null
      const date = new Date(dateString)
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }, [])

    const handleValidatorSwitch = useCallback(
      (validatorAddress: string) => (e: React.MouseEvent) => {
        e.stopPropagation()
        setSearchParams(prev => {
          prev.set('validator', validatorAddress)
          return prev
        })
      },
      [setSearchParams],
    )

    const handleClaimClick = useCallback(
      (validatorSummary: ValidatorSummary, passthrough: string, manageActionType: string) =>
        (e: React.MouseEvent) => {
          e.stopPropagation()
          const claimableBalance = validatorSummary.byType[YieldBalanceType.Claimable]
          setClaimModalData({
            validatorAddress: validatorSummary.validator.address,
            validatorName: validatorSummary.validator.name,
            validatorLogoURI: validatorSummary.validator.logoURI,
            amount: claimableBalance?.aggregatedAmount ?? '0',
            assetSymbol: claimableBalance?.token.symbol ?? '',
            assetLogoURI: claimableBalance?.token.logoURI,
            passthrough,
            manageActionType,
          })
        },
      [],
    )

    const loadingElement = useMemo(
      () => (
        <Card
          bg={cardBg}
          borderRadius='xl'
          shadow='sm'
          border='1px solid'
          borderColor={borderColor}
        >
          <CardBody p={6}>
            <Skeleton height='24px' width='200px' mb={4} />
            <VStack spacing={3} align='stretch'>
              <Skeleton height='80px' />
              <Skeleton height='80px' />
            </VStack>
          </CardBody>
        </Card>
      ),
      [borderColor, cardBg],
    )

    const claimModalElement = useMemo(() => {
      if (!claimModalData) return null
      return (
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
      )
    }, [claimModalData, handleClaimClose, yieldItem])

    if (!requiresValidatorSelection || !address) return null
    if (isBalancesLoading) return loadingElement
    if (!hasValidatorPositions) return null

    return (
      <Card bg={cardBg} borderRadius='xl' shadow='sm' border='1px solid' borderColor={borderColor}>
        <CardBody p={6}>
          <Flex
            justifyContent='space-between'
            alignItems='center'
            mb={isOpen ? 4 : 0}
            cursor='pointer'
            onClick={onToggle}
            _hover={{ opacity: 0.8 }}
            transition='opacity 0.2s'
          >
            <Box>
              <Heading
                as='h3'
                size='sm'
                textTransform='uppercase'
                color='text.subtle'
                letterSpacing='wider'
                mb={1}
              >
                {translate('yieldXYZ.allPositions')}
              </Heading>
              <Text fontSize='lg' fontWeight='bold'>
                <Amount.Fiat value={allPositionsTotalUserCurrency} />
              </Text>
            </Box>
            <Box color='text.subtle'>
              {isOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
            </Box>
          </Flex>
          <Collapse in={isOpen} animateOpacity>
            <VStack spacing={3} align='stretch'>
              {validators.map((validatorSummary, index) => {
                const isSelected = validatorSummary.validator.address === selectedValidator

                return (
                  <Box key={validatorSummary.validator.address}>
                    {index > 0 && <Divider borderColor={borderColor} mb={3} />}
                    <ValidatorCard
                      validatorSummary={validatorSummary}
                      isSelected={isSelected}
                      userCurrencyToUsdRate={userCurrencyToUsdRate}
                      hoverBg={hoverBg}
                      onValidatorSwitch={handleValidatorSwitch(validatorSummary.validator.address)}
                      onClaimClick={handleClaimClick(
                        validatorSummary,
                        validatorSummary.claimAction?.passthrough ?? '',
                        validatorSummary.claimAction?.type ?? '',
                      )}
                      formatUnlockDate={formatUnlockDate}
                    />
                  </Box>
                )
              })}
            </VStack>
          </Collapse>
        </CardBody>
        {claimModalElement}
      </Card>
    )
  },
)
