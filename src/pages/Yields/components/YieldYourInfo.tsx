import {
  Alert,
  AlertIcon,
  Box,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  Skeleton,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { formatLargeNumber } from '@/lib/utils/formatters'
import type { AugmentedYieldBalance, AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import { useYieldBalances } from '@/react-queries/queries/yieldxyz/useYieldBalances'
import { selectFirstAccountIdByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldYourInfoProps = {
  yieldItem: AugmentedYieldDto
}

export const YieldYourInfo = ({ yieldItem }: YieldYourInfoProps) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

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

  const extractBalance = (type: YieldBalanceType) =>
    balances?.find((b: AugmentedYieldBalance) => b.type === type)

  const activeBalance = extractBalance(YieldBalanceType.Active)
  const enteringBalance = extractBalance(YieldBalanceType.Entering)
  const exitingBalance = extractBalance(YieldBalanceType.Exiting)
  const withdrawableBalance = extractBalance(YieldBalanceType.Withdrawable)
  const claimableBalance = extractBalance(YieldBalanceType.Claimable)

  const formatBalance = (balance: AugmentedYieldBalance | undefined) => {
    if (!balance) return '0'
    return `${formatLargeNumber(bnOrZero(balance.amount).toNumber())} ${balance.token.symbol}`
  }

  const formatUsd = (balance: AugmentedYieldBalance | undefined) => {
    if (!balance) return '$0.00'
    return formatLargeNumber(bnOrZero(balance.amountUsd).toNumber(), '$')
  }

  const hasActivePosition = activeBalance && bnOrZero(activeBalance.amount).gt(0)
  const hasEntering = enteringBalance && bnOrZero(enteringBalance.amount).gt(0)
  const hasExiting = exitingBalance && bnOrZero(exitingBalance.amount).gt(0)
  const hasWithdrawable = withdrawableBalance && bnOrZero(withdrawableBalance.amount).gt(0)
  const hasClaimable = claimableBalance && bnOrZero(claimableBalance.amount).gt(0)

  return (
    <Card bg={cardBg} borderRadius='xl' shadow='sm' border='1px solid' borderColor={borderColor}>
      <CardBody p={6}>
        <Heading
          as='h3'
          size='sm'
          mb={6}
          textTransform='uppercase'
          color='text.subtle'
          letterSpacing='wider'
        >
          {translate('yieldXYZ.yourInfo')}
        </Heading>

        <VStack spacing={4} align='stretch'>
          <Flex justifyContent='space-between' alignItems='center'>
            <Text fontSize='sm' color='text.subtle'>
              {translate('common.wallet')}
            </Text>
            {address ? (
              <Box
                bg='gray.700'
                px={3}
                py={1}
                borderRadius='full'
                fontFamily='monospace'
                fontSize='xs'
                color='gray.200'
              >
                {address.slice(0, 6)}...{address.slice(-4)}
              </Box>
            ) : (
              <Text fontSize='sm' color='yellow.400'>
                {translate('common.notConnected')}
              </Text>
            )}
          </Flex>

          <Divider borderColor={borderColor} />

          <Box py={2}>
            <Text fontSize='xs' color='text.subtle' mb={1}>
              {translate('yieldXYZ.activeBalance')}
            </Text>
            {isLoading ? (
              <Box>
                <Skeleton height='32px' width='140px' mb={2} />
                <Skeleton height='16px' width='80px' />
              </Box>
            ) : isError ? (
              <Alert status='error' variant='subtle' borderRadius='md' py={2}>
                <AlertIcon boxSize='16px' />
                <Text fontSize='xs'>Failed to load position</Text>
              </Alert>
            ) : (
              <Flex direction='column'>
                <Text fontSize='2xl' fontWeight='bold'>
                  {formatUsd(activeBalance)}
                </Text>
                <Text fontSize='sm' color='text.subtle'>
                  {formatBalance(activeBalance)}
                </Text>
                {!hasActivePosition && (
                  <Text fontSize='xs' color='text.subtle' mt={2} fontStyle='italic'>
                    No active position
                  </Text>
                )}
              </Flex>
            )}
          </Box>

          {!isLoading && (
            <>
              {hasEntering && (
                <Box
                  p={3}
                  bg='yellow.900'
                  borderRadius='md'
                  border='1px solid'
                  borderColor='yellow.700'
                >
                  <Flex justifyContent='space-between' alignItems='center'>
                    <Text fontSize='xs' color='yellow.200'>
                      {translate('yieldXYZ.entering')}
                    </Text>
                    <Text fontSize='sm' fontWeight='bold' color='yellow.100'>
                      {formatBalance(enteringBalance)}
                    </Text>
                  </Flex>
                  <Text fontSize='xs' color='yellow.400' mt={1}>
                    Transaction in progress
                  </Text>
                </Box>
              )}

              {hasExiting && (
                <Box
                  p={3}
                  bg='orange.900'
                  borderRadius='md'
                  border='1px solid'
                  borderColor='orange.700'
                >
                  <Flex justifyContent='space-between' alignItems='center'>
                    <Text fontSize='xs' color='orange.200'>
                      {translate('yieldXYZ.exiting')}
                    </Text>
                    <Text fontSize='sm' fontWeight='bold' color='orange.100'>
                      {formatBalance(exitingBalance)}
                    </Text>
                  </Flex>
                  <Text fontSize='xs' color='orange.400' mt={1}>
                    Unstaking in progress
                  </Text>
                </Box>
              )}

              {hasWithdrawable && (
                <Box
                  p={3}
                  bg='green.900'
                  borderRadius='md'
                  border='1px solid'
                  borderColor='green.700'
                >
                  <Flex justifyContent='space-between' alignItems='center'>
                    <Text fontSize='xs' color='green.200'>
                      {translate('yieldXYZ.withdrawable')}
                    </Text>
                    <Text fontSize='sm' fontWeight='bold' color='green.100'>
                      {formatBalance(withdrawableBalance)}
                    </Text>
                  </Flex>
                  <Text fontSize='xs' color='green.400' mt={1}>
                    Ready to withdraw
                  </Text>
                </Box>
              )}

              {hasClaimable && (
                <Box
                  p={3}
                  bg='purple.900'
                  borderRadius='md'
                  border='1px solid'
                  borderColor='purple.700'
                >
                  <Flex justifyContent='space-between' alignItems='center'>
                    <Text fontSize='xs' color='purple.200'>
                      {translate('yieldXYZ.claimable')}
                    </Text>
                    <Text fontSize='sm' fontWeight='bold' color='purple.100'>
                      {formatBalance(claimableBalance)}
                    </Text>
                  </Flex>
                  <Text fontSize='xs' color='purple.400' mt={1}>
                    Rewards available
                  </Text>
                </Box>
              )}
            </>
          )}
        </VStack>
      </CardBody>
    </Card>
  )
}
