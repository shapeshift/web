import {
  Avatar,
  Box,
  Button,
  Flex,
  Icon,
  Skeleton,
  Select,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaMoneyBillWave } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useLocation, useSearchParams } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetInput } from '@/components/DeFi/components/AssetInput'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID,
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SUI_GAS_BUFFER,
} from '@/lib/yieldxyz/constants'
import type { AugmentedYieldBalance, AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { YieldActionModal } from '@/pages/Yields/components/YieldActionModal'
import { YieldValidatorSelectModal } from '@/pages/Yields/components/YieldValidatorSelectModal'
import { useYieldAccount } from '@/pages/Yields/YieldAccountContext'
import { ChevronDownIcon } from '@chakra-ui/icons'
import { useYieldBalances } from '@/react-queries/queries/yieldxyz/useYieldBalances'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldEnterExitProps = {
  yieldItem: AugmentedYieldDto
  isQuoteLoading?: boolean
}

const percentOptions = [0.25, 0.5, 0.75, 1]

const YieldEnterExitSkeleton = () => (
  <Flex direction='column' gap={4}>
    <Skeleton height='56px' borderRadius='lg' />
    <Skeleton height='56px' borderRadius='lg' />
  </Flex>
)

export const YieldEnterExit = ({ yieldItem, isQuoteLoading }: YieldEnterExitProps) => {
  const translate = useTranslate()
  const location = useLocation()
  const { accountNumber } = useYieldAccount()
  const { state: walletState, dispatch } = useWallet()
  const isConnected = Boolean(walletState.walletInfo)
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const initialTab = useMemo(() => {
    if (location.pathname.endsWith('/exit')) return 1
    if (location.pathname.endsWith('/enter')) return 0
    return 0
  }, [location.pathname])

  const [tabIndex, setTabIndex] = useState(initialTab)
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'enter' | 'exit'>('enter')
  const [isValidatorModalOpen, setIsValidatorModalOpen] = useState(false)

  const { chainId } = yieldItem

  // Validator Selection Logic
  // Validator Selection Logic
  const [searchParams, setSearchParams] = useSearchParams()
  const validatorParam = searchParams.get('validator')
  const defaultValidator = chainId ? DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId] : undefined

  // Initialize with URL param or default
  const [selectedValidatorAddress, setSelectedValidatorAddress] = useState<string | undefined>(
    validatorParam || defaultValidator,
  )

  // Sync state with URL param
  const handleValidatorChange = useCallback((newAddress: string) => {
    setSelectedValidatorAddress(newAddress)
    setSearchParams(params => {
      params.set('validator', newAddress)
      return params
    })
  }, [setSearchParams])

  // Sync initial mount if missing param but have default
  useEffect(() => {
    if (!validatorParam && defaultValidator) {
      setSearchParams(params => {
        params.set('validator', defaultValidator)
        return params
      }, { replace: true })
    }
  }, [defaultValidator, validatorParam, setSearchParams])

  const shouldFetchValidators =
    yieldItem.mechanics.type === 'staking' && yieldItem.mechanics.requiresValidatorSelection
  const { data: validators } = useYieldValidators(yieldItem.id, shouldFetchValidators)

  // const selectedValidator = validators?.find(v => v.address === selectedValidatorAddress)
  const validatorMetadata = useMemo(() => {
    if (!selectedValidatorAddress) return undefined
    const found = validators?.find(v => v.address === selectedValidatorAddress)
    if (found) return found

    if (selectedValidatorAddress === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) {
      return {
        name: 'ShapeShift',
        logoURI: 'https://assets.coincap.io/assets/icons/256/fox.png',
        address: selectedValidatorAddress,
        apr: '0',
        commission: '0'
      }
    }

    return {
      name: `${selectedValidatorAddress.slice(0, 6)}...${selectedValidatorAddress.slice(-4)}`,
      logoURI: '', // Default avatar will handle empty string
      address: selectedValidatorAddress,
      apr: '0',
      commission: '0'
    }
  }, [validators, selectedValidatorAddress])
  const accountId = useAppSelector(state => {
    if (!chainId) return undefined
    const accountIdsByNumberAndChain = selectAccountIdByAccountNumberAndChainId(state)
    return accountIdsByNumberAndChain[accountNumber]?.[chainId]
  })
  const address = accountId ? fromAccountId(accountId).account : undefined

  const inputToken = yieldItem.inputTokens[0]
  const inputTokenAssetId = inputToken?.assetId

  const inputTokenBalance = useAppSelector(state =>
    inputTokenAssetId && accountId
      ? selectPortfolioCryptoPrecisionBalanceByFilter(state, {
        assetId: inputTokenAssetId,
        accountId,
      })
      : '0',
  )

  const minDeposit = yieldItem.mechanics?.entryLimits?.minimum
  const isBelowMinimum = useMemo(() => {
    if (!cryptoAmount || !minDeposit) return false
    return bnOrZero(cryptoAmount).lt(minDeposit)
  }, [cryptoAmount, minDeposit])

  const {
    data: balances,
    isLoading: isBalancesLoading,
    isFetching: isBalancesFetching,
  } = useYieldBalances({
    yieldId: yieldItem.id,
    address: address ?? '',
    chainId,
  })

  // Combine loading states
  // Combine loading states
  const isLoading = isBalancesLoading || isBalancesFetching || isQuoteLoading

  const extractBalance = (type: YieldBalanceType) =>
    balances?.find((b: AugmentedYieldBalance) => b.type === type)
  const activeBalance = extractBalance(YieldBalanceType.Active)
  const withdrawableBalance = extractBalance(YieldBalanceType.Withdrawable)
  const exitBalance = activeBalance?.amount ?? withdrawableBalance?.amount ?? '0'

  const handlePercentClick = useCallback(
    (percent: number) => {
      const balance = tabIndex === 0 ? inputTokenBalance : exitBalance
      const percentAmount = parseFloat(balance) * percent
      setCryptoAmount(percentAmount.toString())
    },
    [inputTokenBalance, exitBalance, tabIndex],
  )

  const handleMaxClick = useCallback(async () => {
    // await Promise.resolve() // Removed useless promise
    const balance = tabIndex === 0 ? inputTokenBalance : exitBalance

    // For SUI native staking, we must reserve amount for gas
    if (tabIndex === 0 && yieldItem.network === 'sui') {
      const balanceBn = bnOrZero(balance)
      const gasBuffer = bnOrZero(SUI_GAS_BUFFER)
      const maxAmount = balanceBn.minus(gasBuffer)
      setCryptoAmount(maxAmount.gt(0) ? maxAmount.toString() : '0')
      return
    }

    setCryptoAmount(balance)
  }, [inputTokenBalance, exitBalance, tabIndex, yieldItem.network])

  const handleEnterClick = useCallback(() => {
    setModalAction('enter')
    setIsModalOpen(true)
  }, [])

  const handleExitClick = useCallback(() => {
    setModalAction('exit')
    setIsModalOpen(true)
    setIsModalOpen(true)
  }, [])

  // Calculate estimated returns
  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, inputTokenAssetId ?? ''),
  )
  const apy = bnOrZero(yieldItem.rewardRate.total)
  const estimatedYearlyEarnings = bnOrZero(cryptoAmount).times(apy)

  const estimatedYearlyEarningsFiat = estimatedYearlyEarnings.times(marketData?.price ?? 0)
  const fiatAmount = bnOrZero(cryptoAmount)
    .times(marketData?.price ?? 0)
    .toFixed(2)
  const hasAmount = bnOrZero(cryptoAmount).gt(0)
  const inputSymbol = inputToken?.symbol ?? ''

  // Determine unique active validators count
  const uniqueValidatorCount = useMemo(() => {
    if (!balances) return 0
    const unique = new Set(
      balances
        .filter(b => bnOrZero(b.amount).gt(0) && b.validator)
        .map(b => b.validator!.address)
    )
    return unique.size
  }, [balances])

  // Disable picker if on Exit tab and we have 1 or 0 active validators (no choice needed/possible)
  const isPickerDisabled = tabIndex === 1 && uniqueValidatorCount <= 1

  return (
    <>
      <Box
        bg={cardBg}
        borderRadius='xl'
        shadow='sm'
        border='1px solid'
        borderColor={borderColor}
        overflow='hidden'
      >
        {/* Validator Selection Header */}
        {(validators && validators.length > 0) || (selectedValidatorAddress === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) ? (
          <>
            <Box
              p={4}
              borderBottom='1px solid'
              borderColor={borderColor}
              bg='blackAlpha.50'
              _hover={!isPickerDisabled ? { bg: 'whiteAlpha.100' } : undefined}
              cursor={!isPickerDisabled ? 'pointer' : 'default'}
              onClick={!isPickerDisabled ? () => setIsValidatorModalOpen(true) : undefined}
              transition='background 0.2s'
            >
              <Flex justify='space-between' align='center' gap={4}>
                <Flex align='center' gap={3}>
                  {validatorMetadata ? (
                    <>
                      <Avatar size='sm' src={validatorMetadata.logoURI} name={validatorMetadata.name} />
                      <Box>
                        <Text fontWeight='bold' fontSize='sm'>{validatorMetadata.name}</Text>
                        <Flex gap={2} fontSize='xs' color='text.subtle'>
                          {validatorMetadata.address === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS && (
                            <Text color='blue.400' fontWeight='bold'>Preferred</Text>
                          )}
                          {validatorMetadata.rewardRate?.total && (
                            <Text color='green.400'>
                              {(validatorMetadata.rewardRate.total * 100).toFixed(2)}% APR
                            </Text>
                          )}
                        </Flex>
                      </Box>
                    </>
                  ) : (
                    <Text fontWeight='bold' fontSize='sm'>Select Validator</Text>
                  )}
                </Flex>

                {!isPickerDisabled && <Icon as={ChevronDownIcon} color='gray.500' />}
              </Flex>
            </Box>

            <YieldValidatorSelectModal
              isOpen={isValidatorModalOpen}
              onClose={() => setIsValidatorModalOpen(false)}
              validators={validators || []}
              onSelect={handleValidatorChange}
              balances={balances}
            />
          </>
        ) : null}

        <Tabs
          index={tabIndex}
          onChange={setTabIndex}
          isFitted
          variant='enclosed'
          borderBottomWidth={0}
        >
          <TabList mb='0' borderBottom='1px solid' borderColor={borderColor} bg='blackAlpha.200'>
            <Tab
              _selected={{
                color: 'blue.400',
                bg: cardBg,
                borderBottomColor: cardBg,
                borderTopColor: 'blue.400',
                borderTopWidth: 2,
              }}
              _focus={{ boxShadow: 'none' }}
              fontWeight='bold'
              py={4}
              borderBottomWidth='1px'
              borderRadius={0}
              borderTopWidth='2px'
              borderTopColor='transparent'
              isDisabled={!yieldItem.status.enter}
              opacity={!yieldItem.status.enter ? 0.5 : 1}
            >
              {translate('yieldXYZ.enter')}
            </Tab>
            <Tab
              _selected={{
                color: 'blue.400',
                bg: cardBg,
                borderBottomColor: cardBg,
                borderTopColor: 'blue.400',
                borderTopWidth: 2,
              }}
              _focus={{ boxShadow: 'none' }}
              fontWeight='bold'
              py={4}
              borderBottomWidth='1px'
              borderRadius={0}
              borderTopWidth='2px'
              borderTopColor='transparent'
              isDisabled={!yieldItem.status.exit}
              opacity={!yieldItem.status.exit ? 0.5 : 1}
            >
              {translate('yieldXYZ.exit')}
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={8}>
              <Flex direction='column' gap={2}>
                {isBalancesLoading ? (
                  <YieldEnterExitSkeleton />
                ) : (
                  <AssetInput
                    accountId={accountId}
                    assetId={inputTokenAssetId ?? ''}
                    assetSymbol={inputToken?.symbol ?? ''}
                    assetIcon={yieldItem.metadata.logoURI}
                    cryptoAmount={cryptoAmount}
                    balance={inputTokenBalance}
                    percentOptions={percentOptions}
                    onChange={setCryptoAmount}
                    onPercentOptionClick={handlePercentClick}
                    onMaxClick={handleMaxClick}
                    fiatAmount={fiatAmount}
                    showFiatAmount={true}
                  />
                )}



                {minDeposit && !isLoading && (
                  <Flex justifyContent='space-between' width='full' px={1}>
                    <Flex gap={2} alignItems='center'>
                      <Icon as={FaMoneyBillWave} color='gray.500' boxSize={3} />
                      <Text fontSize='xs' color='gray.500' fontWeight='medium'>
                        {translate('yieldXYZ.minDeposit')}
                      </Text>
                    </Flex>
                    <Text
                      fontSize='xs'
                      color={isBelowMinimum ? 'red.500' : 'gray.500'}
                      fontWeight='bold'
                    >
                      {minDeposit} {inputToken?.symbol}
                    </Text>
                  </Flex>
                )}



                {/* Estimated Earnings Carrot */}
                <Box
                  bg={useColorModeValue('gray.50', 'whiteAlpha.50')}
                  borderRadius='lg'
                  p={4}
                  border='1px solid'
                  borderColor={useColorModeValue('gray.100', 'whiteAlpha.100')}
                >
                  <Flex justify='space-between' align='center' mb={hasAmount ? 2 : 0}>
                    <Text fontSize='sm' color='text.subtle' fontWeight='medium'>
                      Current APY
                    </Text>
                    <GradientApy fontSize='sm' fontWeight='bold'>
                      {apy.times(100).toFixed(2)}%
                    </GradientApy>
                  </Flex>

                  {hasAmount && (
                    <>
                      <Flex justify='space-between' align='center'>
                        <Text fontSize='sm' color='text.subtle' fontWeight='medium'>
                          Est. Yearly Earnings/yr
                        </Text>
                        <Flex direction='column' align='flex-end'>
                          <GradientApy fontSize='sm' fontWeight='bold'>
                            {estimatedYearlyEarnings.decimalPlaces(4).toString()} {inputSymbol}
                          </GradientApy>
                          <Flex color='gray.500' fontWeight='normal' fontSize='xs'>
                            <Amount.Fiat value={estimatedYearlyEarningsFiat.toString()} />
                          </Flex>
                        </Flex>
                      </Flex>
                    </>
                  )}
                </Box>

                <Button
                  colorScheme='blue'
                  size='lg'
                  width='full'
                  height='56px'
                  fontSize='lg'
                  isDisabled={
                    isConnected &&
                    (isLoading ||
                      !yieldItem.status.enter ||
                      !cryptoAmount ||
                      isBelowMinimum ||
                      !!isQuoteLoading)
                  }
                  onClick={
                    isConnected
                      ? handleEnterClick
                      : () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
                  }
                  _hover={{ transform: 'translateY(-1px)', boxShadow: 'lg' }}
                >
                  {isQuoteLoading
                    ? translate('common.loading')
                    : isConnected
                      ? translate('yieldXYZ.enter')
                      : translate('common.connectWallet')}
                </Button>
              </Flex>
            </TabPanel>

            <TabPanel p={8}>
              <Flex direction='column' gap={2}>
                {isBalancesLoading ? (
                  <YieldEnterExitSkeleton />
                ) : (
                  <AssetInput
                    accountId={accountId}
                    assetId={inputTokenAssetId ?? ''}
                    assetSymbol={yieldItem.token.symbol}
                    assetIcon={yieldItem.metadata.logoURI}
                    cryptoAmount={cryptoAmount}
                    balance={exitBalance}
                    percentOptions={percentOptions}
                    onChange={setCryptoAmount}
                    onPercentOptionClick={handlePercentClick}
                    onMaxClick={handleMaxClick}
                    fiatAmount={fiatAmount}
                    showFiatAmount={true}
                  />
                )}

                <Button
                  colorScheme='blue'
                  size='lg'
                  width='full'
                  height='56px'
                  fontSize='lg'
                  isDisabled={isConnected && (isLoading || !yieldItem.status.exit || !cryptoAmount)}
                  onClick={
                    isConnected
                      ? handleExitClick
                      : () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
                  }
                  _hover={{ transform: 'translateY(-1px)', boxShadow: 'lg' }}
                >
                  {isConnected ? translate('yieldXYZ.exit') : translate('common.connectWallet')}
                </Button>
              </Flex>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <YieldActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        yieldItem={yieldItem}
        action={modalAction}
        amount={cryptoAmount}
        assetSymbol={modalAction === 'enter' ? inputToken?.symbol ?? '' : yieldItem.token.symbol}
        validatorAddress={selectedValidatorAddress}
      />
    </>
  )
}
