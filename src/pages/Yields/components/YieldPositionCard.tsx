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
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSearchParams } from 'react-router-dom'

import { YieldActionModal } from './YieldActionModal'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldBalance, AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import { useYieldBalances } from '@/react-queries/queries/yieldxyz/useYieldBalances'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import { selectFirstAccountIdByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldPositionCardProps = {
  yieldItem: AugmentedYieldDto
}

export const YieldPositionCard = ({ yieldItem }: YieldPositionCardProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
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

  // If no param, default to the chain's default validator (same logic as EnterExit)
  const defaultValidator = yieldItem.chainId
    ? DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[yieldItem.chainId]
    : undefined
  const selectedValidatorAddress = validatorParam || defaultValidator

  const { chainId } = yieldItem
  const accountId = useAppSelector(state =>
    chainId ? selectFirstAccountIdByChainId(state, chainId) : undefined,
  )
  const address = accountId ? fromAccountId(accountId).account : undefined

  const {
    data: balances,
    isLoading: isLoadingQuery,
    isError,
    fetchStatus,
  } = useYieldBalances({
    yieldId: yieldItem.id,
    address: address ?? '',
    chainId,
  })

  const isLoading = isLoadingQuery && fetchStatus !== 'idle'

  const aggregateBalancesByType = (type: YieldBalanceType) => {
    // Filter balances by the selected validator
    const matchingBalances =
      balances?.filter((b: AugmentedYieldBalance) => {
        if (b.type !== type) return false
        // If we have a selected validator, only include balances for that validator
        if (selectedValidatorAddress && b.validator) {
          return b.validator.address === selectedValidatorAddress
        }
        return true
      }) ?? []

    if (matchingBalances.length === 0) return undefined

    const totalAmount = matchingBalances.reduce(
      (sum, b) => sum.plus(bnOrZero(b.amount)),
      bnOrZero(0),
    )
    const totalAmountUsd = matchingBalances.reduce(
      (sum, b) => sum.plus(bnOrZero(b.amountUsd)),
      bnOrZero(0),
    )

    return {
      ...matchingBalances[0],
      amount: totalAmount.toFixed(),
      amountUsd: totalAmountUsd.toFixed(),
    } as AugmentedYieldBalance
  }

  const activeBalance = aggregateBalancesByType(YieldBalanceType.Active)
  const enteringBalance = aggregateBalancesByType(YieldBalanceType.Entering)
  const exitingBalance = aggregateBalancesByType(YieldBalanceType.Exiting)
  const withdrawableBalance = aggregateBalancesByType(YieldBalanceType.Withdrawable)
  const claimableBalance = aggregateBalancesByType(YieldBalanceType.Claimable)

  // Check for Claim Action
  const claimAction = useMemo(() => {
    return claimableBalance?.pendingActions?.find(action => action.type === 'CLAIM_REWARDS')
  }, [claimableBalance])

  const canClaim = Boolean(claimAction && bnOrZero(claimableBalance?.amount).gt(0))

  const formatBalance = (balance: AugmentedYieldBalance | undefined) => {
    if (!balance) return '0'
    return <Amount.Crypto value={balance.amount} symbol={balance.token.symbol} abbreviated />
  }
  const hasEntering = enteringBalance && bnOrZero(enteringBalance.amount).gt(0)
  const hasExiting = exitingBalance && bnOrZero(exitingBalance.amount).gt(0)
  const hasWithdrawable = withdrawableBalance && bnOrZero(withdrawableBalance.amount).gt(0)
  const hasClaimable = Boolean(claimableBalance)

  const totalValueUsd = [
    activeBalance,
    enteringBalance,
    exitingBalance,
    withdrawableBalance,
  ].reduce((sum, b) => sum.plus(bnOrZero(b?.amountUsd)), bnOrZero(0))
  const totalAmount = [activeBalance, enteringBalance, exitingBalance, withdrawableBalance].reduce(
    (sum, b) => sum.plus(bnOrZero(b?.amount)),
    bnOrZero(0),
  )
  const hasAnyPosition = totalAmount.gt(0)

  const { data: validators } = useYieldValidators(yieldItem.id)
  const selectedValidatorName = useMemo(() => {
    if (!selectedValidatorAddress) return undefined
    const found = validators?.find(v => v.address === selectedValidatorAddress)
    if (found) return found.name

    const foundInBalances = balances?.find(b => b.validator?.address === selectedValidatorAddress)
    return foundInBalances?.validator?.name
  }, [validators, selectedValidatorAddress, balances])

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
            {selectedValidatorName
              ? translate('yieldXYZ.myValidatorPosition', { validator: selectedValidatorName })
              : translate('yieldXYZ.myPosition')}
          </Heading>
          {address && (
            <Badge
              variant='subtle'
              colorScheme='blue'
              borderRadius='full'
              px={2}
              py={0.5}
              bg={badgeBg}
              color={badgeColor}
            >
              {address.slice(0, 4)}...{address.slice(-4)}
            </Badge>
          )}
        </Flex>

        {isLoading ? (
          <VStack align='stretch' spacing={4}>
            <Skeleton height='60px' />
            <Skeleton height='40px' />
          </VStack>
        ) : isError ? (
          <Alert status='error' variant='subtle' borderRadius='md'>
            <AlertIcon />
            <Text fontSize='sm'>{translate('common.error')}</Text>
          </Alert>
        ) : (
          <VStack spacing={6} align='stretch'>
            {/* Main Position Value */}
            <Box>
              <Text fontSize='xs' color='text.subtle' mb={1} textTransform='uppercase'>
                {translate('yieldXYZ.totalValue')}
              </Text>
              <Text fontSize='3xl' fontWeight='800' lineHeight='1'>
                <Amount.Fiat value={totalValueUsd.toFixed()} abbreviated />
              </Text>
              <Text fontSize='sm' color='text.subtle' mt={1}>
                <Amount.Crypto
                  value={totalAmount.toFixed()}
                  symbol={yieldItem.token.symbol}
                  abbreviated
                />
              </Text>
            </Box>

            {/* Empty State CTA */}
            {!hasAnyPosition && (
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
                    Start Earning
                  </Text>
                </Flex>
                <Text fontSize='sm' color={emptyStateTextColor}>
                  Deposit your {yieldItem.token.symbol} to start earning yield securely.
                </Text>
              </Alert>
            )}

            {/* Pending Actions Section */}
            {(hasEntering || hasExiting || hasWithdrawable || hasClaimable) && (
              <>
                <Divider borderColor={borderColor} />
                <VStack spacing={3} align='stretch'>
                  {hasEntering && (
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
                        Pending
                      </Badge>
                    </Flex>
                  )}
                  {hasExiting && (
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
                  )}
                  {hasWithdrawable && (
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
                        Ready
                      </Badge>
                    </Flex>
                  )}
                  {hasClaimable && (
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
                          Reward
                        </Badge>
                        {claimAction && (
                          <Button
                            size='xs'
                            colorScheme='purple'
                            variant='solid'
                            onClick={onOpen}
                            isDisabled={!canClaim}
                          >
                            {translate('common.claim')}
                          </Button>
                        )}
                      </HStack>
                    </Flex>
                  )}
                </VStack>
              </>
            )}

            {/* Action Modal */}
            <YieldActionModal
              yieldItem={yieldItem}
              action='manage'
              isOpen={isOpen}
              onClose={onClose}
              amount={claimableBalance?.amount ?? '0'}
              assetSymbol={claimableBalance?.token.symbol ?? ''}
              assetLogoURI={claimableBalance?.token.logoURI}
              validatorAddress={selectedValidatorAddress}
              validatorName={claimableBalance?.validator?.name}
              validatorLogoURI={claimableBalance?.validator?.logoURI}
              passthrough={claimAction?.passthrough}
            />
          </VStack>
        )}
      </CardBody>
    </Card>
  )
}
