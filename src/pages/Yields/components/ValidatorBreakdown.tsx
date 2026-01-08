import {
  Avatar,
  Box,
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
import { useCallback, useMemo } from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

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

  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const hoverBg = useColorModeValue('gray.50', 'gray.750')

  const { chainId } = yieldItem
  const accountId = useAppSelector(state =>
    chainId ? selectFirstAccountIdByChainId(state, chainId) : undefined,
  )
  const address = accountId ? fromAccountId(accountId).account : undefined

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
    return groupedByValidator.length > 0
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
          <Heading
            as='h3'
            size='sm'
            textTransform='uppercase'
            color='text.subtle'
            letterSpacing='wider'
          >
            {translate('yieldXYZ.validatorBreakdown')}
          </Heading>
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

              return (
                <Box key={group.validator.address}>
                  {index > 0 && <Divider borderColor={borderColor} mb={3} />}
                  <Flex
                    direction='column'
                    gap={3}
                    p={3}
                    borderRadius='lg'
                    bg={hoverBg}
                    transition='background 0.2s'
                  >
                    <HStack spacing={3}>
                      <Avatar
                        src={group.validator.logoURI}
                        name={group.validator.name}
                        size='sm'
                        bg='gray.700'
                      />
                      <Box flex={1}>
                        <Text fontWeight='semibold' fontSize='sm'>
                          {group.validator.name}
                        </Text>
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
                          bg='blue.900'
                        >
                          <HStack spacing={1}>
                            <Text
                              fontSize='xs'
                              color='blue.300'
                              fontWeight='semibold'
                              textTransform='uppercase'
                            >
                              {translate('yieldXYZ.entering')}
                            </Text>
                            {group.entering.date && (
                              <Text fontSize='xs' color='blue.400'>
                                ({formatUnlockDate(group.entering.date)})
                              </Text>
                            )}
                          </HStack>
                          <Text fontSize='sm' fontWeight='medium' color='blue.200'>
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
                          bg='orange.900'
                        >
                          <HStack spacing={1}>
                            <Text
                              fontSize='xs'
                              color='orange.300'
                              fontWeight='semibold'
                              textTransform='uppercase'
                            >
                              {translate('yieldXYZ.exiting')}
                            </Text>
                            {group.exiting.date && (
                              <Text fontSize='xs' color='orange.400'>
                                ({formatUnlockDate(group.exiting.date)})
                              </Text>
                            )}
                          </HStack>
                          <Text fontSize='sm' fontWeight='medium' color='orange.200'>
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
                          bg='purple.900'
                        >
                          <Text
                            fontSize='xs'
                            color='purple.300'
                            fontWeight='semibold'
                            textTransform='uppercase'
                          >
                            {translate('yieldXYZ.claimable')}
                          </Text>
                          <Text fontSize='sm' fontWeight='medium' color='purple.200'>
                            <Amount.Crypto
                              value={group.claimable.amount}
                              symbol={group.claimable.token.symbol}
                              abbreviated
                            />
                          </Text>
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
    </Card>
  )
}
