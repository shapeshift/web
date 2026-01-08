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
import { useCallback, useMemo, useState } from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSearchParams } from 'react-router-dom'

import { GradientApy } from './GradientApy'
import { YieldActionModal } from './YieldActionModal'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type {
  AugmentedYieldBalance,
  AugmentedYieldDto,
  YieldBalanceValidator,
} from '@/lib/yieldxyz/types'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import { useYieldBalances } from '@/react-queries/queries/yieldxyz/useYieldBalances'
import { selectFirstAccountIdByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ValidatorBreakdownProps = {
  yieldItem: AugmentedYieldDto
}

type ValidatorGroupedBalances = {
  validator: YieldBalanceValidator
  active: AugmentedYieldBalance | undefined
  entering: AugmentedYieldBalance | undefined
  exiting: AugmentedYieldBalance | undefined
  claimable: AugmentedYieldBalance | undefined
  totalUsd: string
}

export const ValidatorBreakdown = ({ yieldItem }: ValidatorBreakdownProps) => {
  const translate = useTranslate()
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true })

  // Modal state
  const [claimModalData, setClaimModalData] = useState<{
    validatorAddress: string
    validatorName: string
    validatorLogoURI: string | undefined
    amount: string
    assetSymbol: string
    assetLogoURI: string | undefined
    passthrough: string
  } | null>(null)

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
  const accountId = useAppSelector(state =>
    chainId ? selectFirstAccountIdByChainId(state, chainId) : undefined,
  )
  const address = accountId ? fromAccountId(accountId).account : undefined

  const [searchParams, setSearchParams] = useSearchParams()
  const selectedValidator = searchParams.get('validator')

  const {
    data: balances,
    isLoading: isLoadingQuery,
    fetchStatus,
  } = useYieldBalances({
    yieldId: yieldItem.id,
    address: address ?? '',
    chainId,
  })

  const isLoading = isLoadingQuery && fetchStatus !== 'idle'

  const requiresValidatorSelection = useMemo(() => {
    return yieldItem.mechanics.requiresValidatorSelection
  }, [yieldItem.mechanics.requiresValidatorSelection])

  const groupedByValidator = useMemo((): ValidatorGroupedBalances[] => {
    if (!balances || !requiresValidatorSelection) return []

    const validatorMap = new Map<
      string,
      Omit<ValidatorGroupedBalances, 'totalUsd'> & { totalUsd: ReturnType<typeof bnOrZero> }
    >()

    for (const balance of balances) {
      if (!balance.validator) continue

      const key = balance.validator.address
      const existing = validatorMap.get(key)

      if (!existing) {
        validatorMap.set(key, {
          validator: balance.validator,
          active: balance.type === YieldBalanceType.Active ? balance : undefined,
          entering: balance.type === YieldBalanceType.Entering ? balance : undefined,
          exiting: balance.type === YieldBalanceType.Exiting ? balance : undefined,
          claimable: balance.type === YieldBalanceType.Claimable ? balance : undefined,
          totalUsd: bnOrZero(balance.amountUsd),
        })
      } else {
        if (balance.type === YieldBalanceType.Active) existing.active = balance
        if (balance.type === YieldBalanceType.Entering) existing.entering = balance
        if (balance.type === YieldBalanceType.Exiting) existing.exiting = balance
        if (balance.type === YieldBalanceType.Claimable) existing.claimable = balance
        existing.totalUsd = existing.totalUsd.plus(bnOrZero(balance.amountUsd))
      }
    }

    return Array.from(validatorMap.values())
      .filter(
        group =>
          bnOrZero(group.active?.amount).gt(0) ||
          bnOrZero(group.entering?.amount).gt(0) ||
          bnOrZero(group.exiting?.amount).gt(0) ||
          bnOrZero(group.claimable?.amount).gt(0),
      )
      .map(group => ({ ...group, totalUsd: group.totalUsd.toFixed() }))
  }, [balances, requiresValidatorSelection])

  const hasValidatorPositions = useMemo(() => {
    return groupedByValidator.length > 1
  }, [groupedByValidator.length])

  const formatUnlockDate = useCallback((dateString: string | undefined) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }, [])

  if (!requiresValidatorSelection || !address) {
    return null
  }

  if (isLoading) {
    return (
      <Card bg={cardBg} borderRadius='xl' shadow='sm' border='1px solid' borderColor={borderColor}>
        <CardBody p={6}>
          <Skeleton height='24px' width='200px' mb={4} />
          <VStack spacing={3} align='stretch'>
            <Skeleton height='80px' />
            <Skeleton height='80px' />
          </VStack>
        </CardBody>
      </Card>
    )
  }

  if (!hasValidatorPositions) {
    return null
  }

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
              <Amount.Fiat
                value={groupedByValidator
                  .reduce((acc, g) => acc.plus(bnOrZero(g.totalUsd)), bnOrZero(0))
                  .toFixed()}
              />
            </Text>
          </Box>
          <Box color='text.subtle'>
            {isOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
          </Box>
        </Flex>

        <Collapse in={isOpen} animateOpacity>
          <VStack spacing={3} align='stretch'>
            {groupedByValidator.map((group, index) => {
              const hasActive = bnOrZero(group.active?.amount).gt(0)
              const hasEntering = bnOrZero(group.entering?.amount).gt(0)
              const hasExiting = bnOrZero(group.exiting?.amount).gt(0)
              const hasClaimable = bnOrZero(group.claimable?.amount).gt(0)
              const isSelected = group.validator.address === selectedValidator

              return (
                <Box key={group.validator.address}>
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
                        onClick={e => {
                          e.stopPropagation()
                          setSearchParams(prev => {
                            prev.set('validator', group.validator.address)
                            return prev
                          })
                        }}
                      >
                        {translate('yieldXYZ.switch')}
                      </Button>
                    )}

                    <HStack spacing={3}>
                      <Avatar
                        src={group.validator.logoURI}
                        name={group.validator.name}
                        size='sm'
                        bg='gray.700'
                      />
                      <Box flex={1}>
                        <Flex align='center' gap={2}>
                          <Text fontWeight='semibold' fontSize='sm'>
                            {group.validator.name}
                          </Text>
                          {group.validator.apr !== undefined &&
                            bnOrZero(group.validator.apr).gt(0) && (
                              <GradientApy fontSize='xs'>
                                {bnOrZero(group.validator.apr).times(100).toFixed(2)}% APR
                              </GradientApy>
                            )}
                        </Flex>
                        <Text fontSize='xs' color='text.subtle'>
                          <Amount.Fiat value={group.totalUsd} />
                        </Text>
                      </Box>
                    </HStack>

                    <VStack spacing={2} align='stretch' pl={10}>
                      {group.active && hasActive && (
                        <Flex justify='space-between' align='center'>
                          <Text fontSize='xs' color='text.subtle' textTransform='uppercase'>
                            {translate('yieldXYZ.staked')}
                          </Text>
                          <Text fontSize='sm' fontWeight='medium'>
                            <Amount.Crypto
                              value={group.active.amount}
                              symbol={group.active.token.symbol}
                              abbreviated
                            />
                          </Text>
                        </Flex>
                      )}

                      {group.entering && hasEntering && (
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
                            {group.entering.date && (
                              <Text fontSize='xs' color={enteringDateColor}>
                                ({formatUnlockDate(group.entering.date)})
                              </Text>
                            )}
                          </HStack>
                          <Text fontSize='sm' fontWeight='medium' color={enteringValueColor}>
                            <Amount.Crypto
                              value={group.entering.amount}
                              symbol={group.entering.token.symbol}
                              abbreviated
                            />
                          </Text>
                        </Flex>
                      )}

                      {group.exiting && hasExiting && (
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
                            {group.exiting.date && (
                              <Text fontSize='xs' color={exitingDateColor}>
                                ({formatUnlockDate(group.exiting.date)})
                              </Text>
                            )}
                          </HStack>
                          <Text fontSize='sm' fontWeight='medium' color={exitingValueColor}>
                            <Amount.Crypto
                              value={group.exiting.amount}
                              symbol={group.exiting.token.symbol}
                              abbreviated
                            />
                          </Text>
                        </Flex>
                      )}

                      {group.claimable && hasClaimable && (
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
                                value={group.claimable.amount}
                                symbol={group.claimable.token.symbol}
                                abbreviated
                              />
                            </Text>
                          </Box>

                          {(() => {
                            const claimAction = group.claimable?.pendingActions?.find(
                              a => a.type === 'CLAIM_REWARDS',
                            )
                            if (!claimAction) return null

                            return (
                              <Button
                                size='xs'
                                colorScheme='purple'
                                variant='solid'
                                onClick={e => {
                                  e.stopPropagation()
                                  setClaimModalData({
                                    validatorAddress: group.validator.address,
                                    validatorName: group.validator.name,
                                    validatorLogoURI: group.validator.logoURI,
                                    amount: group.claimable?.amount ?? '0',
                                    assetSymbol: group.claimable?.token.symbol ?? '',
                                    assetLogoURI: group.claimable?.token.logoURI,
                                    passthrough: claimAction.passthrough,
                                  })
                                }}
                              >
                                {translate('common.claim')}
                              </Button>
                            )
                          })()}
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

      {/* Transaction Modal */}
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
        />
      )}
    </Card>
  )
}
