import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  HStack,
  Icon,
  Skeleton,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { FaExclamationTriangle, FaExternalLinkAlt, FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import {
  selectAccountState,
  selectAccountStateError,
  selectAccountStateLoading,
  selectAccountValue,
  selectAvailableMargin,
  selectIsWalletInitialized,
  selectMarginUsagePercent,
  selectPositionCount,
  selectTotalMarginUsed,
  selectTotalUnrealizedPnl,
  selectWalletAddress,
  selectWithdrawable,
} from '@/state/slices/perpsSlice/selectors'
import { useAppSelector } from '@/state/store'

const HYPERLIQUID_DEPOSIT_URL = 'https://app.hyperliquid.xyz/portfolio'
const LOW_COLLATERAL_THRESHOLD = 100

type AccountInfoProps = {
  isWalletConnected: boolean
  onInitializeWallet?: () => Promise<void>
}

type AccountStatRowProps = {
  label: string
  value: string | undefined
  isLoading: boolean
  prefix?: string
  suffix?: string
  valueColor?: string
  tooltip?: string
}

const AccountStatRow = memo(
  ({ label, value, isLoading, prefix, suffix, valueColor, tooltip }: AccountStatRowProps) => {
    const labelColor = useColorModeValue('gray.500', 'gray.400')

    const content = (
      <HStack justify='space-between' width='full'>
        <Text fontSize='sm' color={labelColor}>
          {label}
        </Text>
        {isLoading ? (
          <Skeleton height='18px' width='80px' />
        ) : (
          <Amount.Fiat
            value={value ?? '0'}
            fontSize='sm'
            fontWeight='medium'
            color={valueColor}
            prefix={prefix}
            suffix={suffix}
          />
        )}
      </HStack>
    )

    if (tooltip) {
      return <Tooltip label={tooltip}>{content}</Tooltip>
    }

    return content
  },
)

type MarginUsageGaugeProps = {
  usagePercent: string | undefined
  isLoading: boolean
}

const MarginUsageGauge = memo(({ usagePercent, isLoading }: MarginUsageGaugeProps) => {
  const translate = useTranslate()
  const greenColor = useColorModeValue('green.500', 'green.400')
  const yellowColor = useColorModeValue('yellow.500', 'yellow.400')
  const redColor = useColorModeValue('red.500', 'red.400')
  const trackColor = useColorModeValue('gray.200', 'whiteAlpha.200')
  const labelColor = useColorModeValue('gray.500', 'gray.400')

  const parsedUsage = useMemo(() => {
    const usage = bnOrZero(usagePercent)
    return Math.min(100, Math.max(0, usage.toNumber()))
  }, [usagePercent])

  const gaugeColor = useMemo(() => {
    if (parsedUsage >= 80) return redColor
    if (parsedUsage >= 50) return yellowColor
    return greenColor
  }, [parsedUsage, redColor, yellowColor, greenColor])

  if (isLoading) {
    return (
      <VStack spacing={1} align='center'>
        <Skeleton height='60px' width='60px' borderRadius='full' />
        <Skeleton height='14px' width='80px' />
      </VStack>
    )
  }

  return (
    <VStack spacing={1} align='center'>
      <CircularProgress
        value={parsedUsage}
        size='60px'
        thickness='8px'
        color={gaugeColor}
        trackColor={trackColor}
      >
        <CircularProgressLabel fontSize='xs' fontWeight='bold'>
          {parsedUsage.toFixed(0)}%
        </CircularProgressLabel>
      </CircularProgress>
      <Text fontSize='xs' color={labelColor}>
        {translate('perps.account.marginUsage')}
      </Text>
    </VStack>
  )
})

const walletIcon = <FaWallet />
const warningIcon = <FaExclamationTriangle />
const externalLinkIcon = <FaExternalLinkAlt />

type WalletNotConnectedProps = {
  onConnect: () => void
}

const WalletNotConnected = memo(({ onConnect }: WalletNotConnectedProps) => {
  const translate = useTranslate()
  const bgColor = useColorModeValue('gray.50', 'whiteAlpha.50')
  const iconColor = useColorModeValue('gray.400', 'gray.500')

  return (
    <VStack spacing={4} py={6} px={4} bg={bgColor} borderRadius='lg'>
      <Icon as={FaWallet} boxSize={8} color={iconColor} />
      <VStack spacing={1}>
        <Text fontWeight='semibold' textAlign='center'>
          {translate('perps.account.connectWalletTitle')}
        </Text>
        <Text fontSize='sm' color='text.subtle' textAlign='center'>
          {translate('perps.account.connectWalletDescription')}
        </Text>
      </VStack>
      <Button
        colorScheme='blue'
        onClick={onConnect}
        leftIcon={walletIcon}
      >
        {translate('common.connectWallet')}
      </Button>
    </VStack>
  )
})

type WalletNotInitializedProps = {
  onInitialize?: () => Promise<void>
}

const WalletNotInitialized = memo(({ onInitialize }: WalletNotInitializedProps) => {
  const translate = useTranslate()

  return (
    <Alert status='warning' borderRadius='lg' flexDirection='column' gap={3} py={4}>
      <HStack>
        <AlertIcon />
        <AlertTitle>{translate('perps.account.walletNotInitialized')}</AlertTitle>
      </HStack>
      <AlertDescription textAlign='center' fontSize='sm'>
        {translate('perps.account.walletNotInitializedDescription')}
      </AlertDescription>
      <HStack spacing={2}>
        {onInitialize && (
          <Button size='sm' colorScheme='yellow' onClick={onInitialize}>
            {translate('perps.account.initializeWallet')}
          </Button>
        )}
        <Button
          as='a'
          href={HYPERLIQUID_DEPOSIT_URL}
          target='_blank'
          rel='noopener noreferrer'
          size='sm'
          variant='outline'
          rightIcon={externalLinkIcon}
        >
          {translate('perps.account.depositOnHyperliquid')}
        </Button>
      </HStack>
    </Alert>
  )
})

type InsufficientCollateralProps = {
  accountValue: string | undefined
}

const InsufficientCollateral = memo(({ accountValue }: InsufficientCollateralProps) => {
  const translate = useTranslate()

  return (
    <Alert status='error' borderRadius='lg' flexDirection='column' gap={3} py={4}>
      <HStack>
        <AlertIcon />
        <AlertTitle>{translate('perps.account.insufficientCollateral')}</AlertTitle>
      </HStack>
      <AlertDescription textAlign='center' fontSize='sm'>
        {translate('perps.account.insufficientCollateralDescription', {
          balance: accountValue ?? '0',
        })}
      </AlertDescription>
      <Button
        as='a'
        href={HYPERLIQUID_DEPOSIT_URL}
        target='_blank'
        rel='noopener noreferrer'
        size='sm'
        colorScheme='blue'
        rightIcon={externalLinkIcon}
      >
        {translate('perps.account.depositUsdc')}
      </Button>
    </Alert>
  )
})

type AccountErrorProps = {
  error: string
}

const AccountError = memo(({ error }: AccountErrorProps) => {
  const translate = useTranslate()

  return (
    <Alert status='error' borderRadius='lg'>
      <AlertIcon />
      <VStack align='flex-start' spacing={0}>
        <AlertTitle fontSize='sm'>{translate('perps.account.error')}</AlertTitle>
        <AlertDescription fontSize='xs'>{error}</AlertDescription>
      </VStack>
    </Alert>
  )
})

const AccountSkeleton = memo(() => {
  return (
    <VStack spacing={3} align='stretch'>
      <Skeleton height='20px' width='60%' />
      <Skeleton height='20px' />
      <Skeleton height='20px' />
      <Skeleton height='20px' />
      <Skeleton height='60px' borderRadius='lg' />
    </VStack>
  )
})

export const AccountInfo = memo(
  ({ isWalletConnected, onInitializeWallet }: AccountInfoProps) => {
    const translate = useTranslate()
    const { dispatch: walletDispatch } = useWallet()

    const borderColor = useColorModeValue('gray.200', 'gray.700')
    const bgColor = useColorModeValue('white', 'gray.800')
    const headerBgColor = useColorModeValue('gray.50', 'whiteAlpha.50')
    const pnlPositiveColor = useColorModeValue('green.500', 'green.400')
    const pnlNegativeColor = useColorModeValue('red.500', 'red.400')

    const isWalletInitialized = useAppSelector(selectIsWalletInitialized)
    const walletAddress = useAppSelector(selectWalletAddress)
    const accountState = useAppSelector(selectAccountState)
    const accountStateLoading = useAppSelector(selectAccountStateLoading)
    const accountStateError = useAppSelector(selectAccountStateError)
    const accountValue = useAppSelector(selectAccountValue)
    const totalMarginUsed = useAppSelector(selectTotalMarginUsed)
    const availableMargin = useAppSelector(selectAvailableMargin)
    const withdrawable = useAppSelector(selectWithdrawable)
    const marginUsagePercent = useAppSelector(selectMarginUsagePercent)
    const totalUnrealizedPnl = useAppSelector(selectTotalUnrealizedPnl)
    const positionCount = useAppSelector(selectPositionCount)

    const handleConnect = useCallback(() => {
      walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    }, [walletDispatch])

    const hasLowCollateral = useMemo(() => {
      if (!accountValue) return false
      return bnOrZero(accountValue).lt(LOW_COLLATERAL_THRESHOLD)
    }, [accountValue])

    const isPnlPositive = useMemo(() => {
      return bnOrZero(totalUnrealizedPnl).gte(0)
    }, [totalUnrealizedPnl])

    const pnlColor = isPnlPositive ? pnlPositiveColor : pnlNegativeColor
    const pnlPrefix = isPnlPositive ? '+' : ''

    const truncatedAddress = useMemo(() => {
      if (!walletAddress) return ''
      return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    }, [walletAddress])

    if (!isWalletConnected) {
      return (
        <Box
          borderRadius='lg'
          border='1px solid'
          borderColor={borderColor}
          bg={bgColor}
          overflow='hidden'
        >
          <Box p={3} borderBottomWidth={1} borderColor={borderColor} bg={headerBgColor}>
            <Text fontSize='sm' fontWeight='semibold'>
              {translate('perps.account.title')}
            </Text>
          </Box>
          <Box p={4}>
            <WalletNotConnected onConnect={handleConnect} />
          </Box>
        </Box>
      )
    }

    if (accountStateLoading && !accountState) {
      return (
        <Box
          borderRadius='lg'
          border='1px solid'
          borderColor={borderColor}
          bg={bgColor}
          overflow='hidden'
        >
          <Box p={3} borderBottomWidth={1} borderColor={borderColor} bg={headerBgColor}>
            <Text fontSize='sm' fontWeight='semibold'>
              {translate('perps.account.title')}
            </Text>
          </Box>
          <Box p={4}>
            <AccountSkeleton />
          </Box>
        </Box>
      )
    }

    if (accountStateError) {
      return (
        <Box
          borderRadius='lg'
          border='1px solid'
          borderColor={borderColor}
          bg={bgColor}
          overflow='hidden'
        >
          <Box p={3} borderBottomWidth={1} borderColor={borderColor} bg={headerBgColor}>
            <Text fontSize='sm' fontWeight='semibold'>
              {translate('perps.account.title')}
            </Text>
          </Box>
          <Box p={4}>
            <AccountError error={accountStateError} />
          </Box>
        </Box>
      )
    }

    return (
      <Box
        borderRadius='lg'
        border='1px solid'
        borderColor={borderColor}
        bg={bgColor}
        overflow='hidden'
      >
        <Box p={3} borderBottomWidth={1} borderColor={borderColor} bg={headerBgColor}>
          <Flex justify='space-between' align='center'>
            <Text fontSize='sm' fontWeight='semibold'>
              {translate('perps.account.title')}
            </Text>
            {walletAddress && (
              <Text fontSize='xs' color='text.subtle' fontFamily='mono'>
                {truncatedAddress}
              </Text>
            )}
          </Flex>
        </Box>

        <VStack spacing={4} p={4} align='stretch'>
          {!isWalletInitialized && (
            <WalletNotInitialized onInitialize={onInitializeWallet} />
          )}

          {isWalletInitialized && hasLowCollateral && (
            <InsufficientCollateral accountValue={accountValue} />
          )}

          <Flex justify='space-between' align='center' gap={4}>
            <VStack spacing={2} align='stretch' flex={1}>
              <AccountStatRow
                label={translate('perps.account.accountValue')}
                value={accountValue}
                isLoading={accountStateLoading}
              />
              <AccountStatRow
                label={translate('perps.account.marginUsed')}
                value={totalMarginUsed}
                isLoading={accountStateLoading}
              />
              <AccountStatRow
                label={translate('perps.account.availableMargin')}
                value={availableMargin}
                isLoading={accountStateLoading}
              />
              <AccountStatRow
                label={translate('perps.account.withdrawable')}
                value={withdrawable}
                isLoading={accountStateLoading}
                tooltip={translate('perps.account.withdrawableTooltip')}
              />
            </VStack>
            <MarginUsageGauge
              usagePercent={marginUsagePercent}
              isLoading={accountStateLoading}
            />
          </Flex>

          {positionCount > 0 && (
            <Box
              bg={useColorModeValue('gray.50', 'whiteAlpha.50')}
              borderRadius='lg'
              p={3}
            >
              <HStack justify='space-between'>
                <VStack spacing={0} align='flex-start'>
                  <Text fontSize='xs' color='text.subtle'>
                    {translate('perps.account.unrealizedPnl')}
                  </Text>
                  <Text fontSize='xs' color='text.subtle'>
                    ({positionCount} {translate('perps.account.positions')})
                  </Text>
                </VStack>
                <Amount.Fiat
                  value={totalUnrealizedPnl}
                  fontSize='md'
                  fontWeight='bold'
                  color={pnlColor}
                  prefix={pnlPrefix}
                />
              </HStack>
            </Box>
          )}

          <Button
            as='a'
            href={HYPERLIQUID_DEPOSIT_URL}
            target='_blank'
            rel='noopener noreferrer'
            size='sm'
            variant='outline'
            rightIcon={externalLinkIcon}
            width='full'
          >
            {translate('perps.account.manageOnHyperliquid')}
          </Button>
        </VStack>
      </Box>
    )
  },
)
