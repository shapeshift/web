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
  NormalizedYieldBalances,
  ValidatorSummary,
} from '@/react-queries/queries/yieldxyz/useYieldBalances'
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

export const ValidatorBreakdown = memo(
  ({ yieldItem, balances, isBalancesLoading }: ValidatorBreakdownProps) => {
    const translate = useTranslate()
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true })
    const [claimModalData, setClaimModalData] = useState<ClaimModalData | null>(null)
    const handleClaimClose = useCallback(() => setClaimModalData(null), [])

    const cardBg = useColorModeValue('white', 'gray.800')
    const borderColor = useColorModeValue('gray.100', 'gray.750')
    const hoverBg = useColorModeValue('gray.50', 'gray.750')
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
                const isSelected = validator.address === selectedValidator

                return (
                  <Box key={validator.address}>
                    {index > 0 && <Divider borderColor={borderColor} mb={3} />}
                    <Flex
                      direction='column'
                      gap={3}
                      p={3}
                      borderRadius='lg'
                      bg={hoverBg}
                      position='relative'
                    >
                      {!isSelected && (
                        <Button
                          size='xs'
                          position='absolute'
                          top={3}
                          right={3}
                          colorScheme='blue'
                          variant='outline'
                          onClick={handleValidatorSwitch(validator.address)}
                        >
                          {translate('yieldXYZ.switch')}
                        </Button>
                      )}
                      <HStack spacing={3}>
                        <Avatar
                          src={validator.logoURI}
                          name={validator.name}
                          size='sm'
                          bg='gray.700'
                        />
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
                            <Amount.Fiat
                              value={bnOrZero(totalUsd).times(userCurrencyToUsdRate).toFixed()}
                            />
                          </Text>
                        </Box>
                      </HStack>
                      <VStack spacing={2} align='stretch' pl={10}>
                        {activeBalance && hasActive && (
                          <Flex justify='space-between' align='center'>
                            <Text fontSize='xs' color='text.subtle' textTransform='uppercase'>
                              {translate('yieldXYZ.staked')}
                            </Text>
                            <Text fontSize='sm' fontWeight='medium'>
                              <Amount.Crypto
                                value={activeBalance.aggregatedAmount}
                                symbol={activeBalance.token.symbol}
                                abbreviated
                              />
                            </Text>
                          </Flex>
                        )}
                        {enteringBalance && hasEntering && (
                          <Flex
                            justify='space-between'
                            align='center'
                            px={2}
                            py={1}
                            borderRadius='md'
                            bg={enteringBg}
                          >
                            <HStack spacing={1}>
                              <Text
                                fontSize='xs'
                                color={enteringTextColor}
                                fontWeight='semibold'
                                textTransform='uppercase'
                              >
                                {translate('yieldXYZ.entering')}
                              </Text>
                              {enteringBalance.date && (
                                <Text fontSize='xs' color={enteringDateColor}>
                                  ({formatUnlockDate(enteringBalance.date)})
                                </Text>
                              )}
                            </HStack>
                            <Text fontSize='sm' fontWeight='medium' color={enteringValueColor}>
                              <Amount.Crypto
                                value={enteringBalance.aggregatedAmount}
                                symbol={enteringBalance.token.symbol}
                                abbreviated
                              />
                            </Text>
                          </Flex>
                        )}
                        {exitingBalance && hasExiting && (
                          <Flex
                            justify='space-between'
                            align='center'
                            px={2}
                            py={1}
                            borderRadius='md'
                            bg={exitingBg}
                          >
                            <HStack spacing={1}>
                              <Text
                                fontSize='xs'
                                color={exitingTextColor}
                                fontWeight='semibold'
                                textTransform='uppercase'
                              >
                                {translate('yieldXYZ.exiting')}
                              </Text>
                              {exitingBalance.date && (
                                <Text fontSize='xs' color={exitingDateColor}>
                                  ({formatUnlockDate(exitingBalance.date)})
                                </Text>
                              )}
                            </HStack>
                            <Text fontSize='sm' fontWeight='medium' color={exitingValueColor}>
                              <Amount.Crypto
                                value={exitingBalance.aggregatedAmount}
                                symbol={exitingBalance.token.symbol}
                                abbreviated
                              />
                            </Text>
                          </Flex>
                        )}
                        {claimableBalance && hasClaimable && (
                          <Flex
                            justify='space-between'
                            align='center'
                            px={2}
                            py={1}
                            borderRadius='md'
                            bg={claimableBg}
                          >
                            <Box>
                              <Text
                                fontSize='xs'
                                color={claimableTextColor}
                                fontWeight='semibold'
                                textTransform='uppercase'
                              >
                                {translate('yieldXYZ.claimable')}
                              </Text>
                              <Text fontSize='sm' fontWeight='medium' color={claimableValueColor}>
                                <Amount.Crypto
                                  value={claimableBalance.aggregatedAmount}
                                  symbol={claimableBalance.token.symbol}
                                  abbreviated
                                />
                              </Text>
                            </Box>
                            {claimAction && (
                              <Button
                                size='xs'
                                colorScheme='purple'
                                variant='solid'
                                onClick={handleClaimClick(
                                  validatorSummary,
                                  claimAction.passthrough,
                                  claimAction.type,
                                )}
                              >
                                {translate('common.claim')}
                              </Button>
                            )}
                          </Flex>
                        )}
                      </VStack>
                    </Flex>
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
