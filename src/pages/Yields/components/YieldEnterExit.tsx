import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Avatar,
  Box,
  Button,
  Flex,
  Icon,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { FaMoneyBillWave } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useLocation, useSearchParams } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetInput } from '@/components/DeFi/components/AssetInput'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto, ValidatorDto } from '@/lib/yieldxyz/types'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { YieldActionModal } from '@/pages/Yields/components/YieldActionModal'
import { YieldValidatorSelectModal } from '@/pages/Yields/components/YieldValidatorSelectModal'
import { useYieldAccount } from '@/pages/Yields/YieldAccountContext'
import type {
  AugmentedYieldBalanceWithAccountId,
  NormalizedYieldBalances,
} from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
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
  balances: NormalizedYieldBalances | undefined
  isBalancesLoading: boolean
}

const percentOptions = [0.25, 0.5, 0.75, 1]

const YieldEnterExitSkeleton = memo(() => (
  <Flex direction='column' gap={4}>
    <Skeleton height='56px' borderRadius='lg' />
    <Skeleton height='56px' borderRadius='lg' />
  </Flex>
))

const moneyBillWaveIcon = <Icon as={FaMoneyBillWave} color='gray.500' boxSize={3} />
const chevronDownIcon = <Icon as={ChevronDownIcon} color='gray.500' />

export const YieldEnterExit = memo(
  ({ yieldItem, isQuoteLoading, balances, isBalancesLoading }: YieldEnterExitProps) => {
    const translate = useTranslate()
    const location = useLocation()
    const { accountNumber } = useYieldAccount()
    const { state: walletState, dispatch } = useWallet()
    const isConnected = useMemo(() => Boolean(walletState.walletInfo), [walletState.walletInfo])

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

    const [searchParams, setSearchParams] = useSearchParams()
    const validatorParam = useMemo(() => searchParams.get('validator'), [searchParams])

    const shouldFetchValidators = useMemo(
      () =>
        yieldItem.mechanics.type === 'staking' && yieldItem.mechanics.requiresValidatorSelection,
      [yieldItem.mechanics.type, yieldItem.mechanics.requiresValidatorSelection],
    )
    const { data: validators } = useYieldValidators(yieldItem.id, shouldFetchValidators)

    const defaultValidator = useMemo(() => {
      if (chainId && DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId])
        return DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId]
      return validators?.[0]?.address
    }, [chainId, validators])

    const selectedValidatorAddress = useMemo(
      () => validatorParam || defaultValidator,
      [validatorParam, defaultValidator],
    )

    const handleValidatorChange = useCallback(
      (newAddress: string) => {
        setSearchParams(params => {
          params.set('validator', newAddress)
          return params
        })
      },
      [setSearchParams],
    )

    useEffect(() => {
      if (!validatorParam && defaultValidator) {
        setSearchParams(
          params => {
            params.set('validator', defaultValidator)
            return params
          },
          { replace: true },
        )
      }
    }, [defaultValidator, validatorParam, setSearchParams])

    const accountId = useAppSelector(state => {
      if (!chainId) return undefined
      const accountIdsByNumberAndChain = selectAccountIdByAccountNumberAndChainId(state)
      return accountIdsByNumberAndChain[accountNumber]?.[chainId]
    })

    const validatorMetadata = useMemo(() => {
      if (!selectedValidatorAddress) return undefined

      const foundInList = validators?.find(v => v.address === selectedValidatorAddress)
      if (foundInList) return foundInList

      const foundInBalances = balances?.raw.find(
        (b: AugmentedYieldBalanceWithAccountId) =>
          b.validator?.address === selectedValidatorAddress,
      )?.validator
      if (foundInBalances)
        return {
          ...foundInBalances,
          apr: undefined,
          commission: undefined,
        }

      return {
        name: `${selectedValidatorAddress.slice(0, 6)}...${selectedValidatorAddress.slice(-4)}`,
        logoURI: '',
        address: selectedValidatorAddress,
        apr: '0',
        commission: '0',
      }
    }, [validators, selectedValidatorAddress, balances])

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

    const isLoading = isBalancesLoading || isQuoteLoading

    const activeBalance = useMemo(
      () =>
        balances?.raw.find((b: AugmentedYieldBalanceWithAccountId) => {
          if (b.type !== YieldBalanceType.Active) return false
          if (selectedValidatorAddress && b.validator)
            return b.validator.address === selectedValidatorAddress
          return true
        }),
      [balances?.raw, selectedValidatorAddress],
    )

    const withdrawableBalance = useMemo(
      () =>
        balances?.raw.find((b: AugmentedYieldBalanceWithAccountId) => {
          if (b.type !== YieldBalanceType.Withdrawable) return false
          if (selectedValidatorAddress && b.validator)
            return b.validator.address === selectedValidatorAddress
          return true
        }),
      [balances?.raw, selectedValidatorAddress],
    )

    const exitBalance = useMemo(
      () => activeBalance?.amount ?? withdrawableBalance?.amount ?? '0',
      [activeBalance?.amount, withdrawableBalance?.amount],
    )

    const handlePercentClick = useCallback(
      (percent: number) => {
        const balance = tabIndex === 0 ? inputTokenBalance : exitBalance
        const percentAmount = bnOrZero(balance).times(percent).toFixed()
        setCryptoAmount(percentAmount)
      },
      [inputTokenBalance, exitBalance, tabIndex],
    )

    const handleMaxClick = useCallback(async () => {
      await Promise.resolve()
      const balance = tabIndex === 0 ? inputTokenBalance : exitBalance
      setCryptoAmount(balance)
    }, [inputTokenBalance, exitBalance, tabIndex])

    const handleEnterClick = useCallback(() => {
      setModalAction('enter')
      setIsModalOpen(true)
    }, [])

    const handleExitClick = useCallback(() => {
      setModalAction('exit')
      setIsModalOpen(true)
    }, [])

    const handleOpenValidatorModal = useCallback(() => setIsValidatorModalOpen(true), [])
    const handleCloseValidatorModal = useCallback(() => setIsValidatorModalOpen(false), [])
    const handleCloseModal = useCallback(() => setIsModalOpen(false), [])

    const handleConnectWallet = useCallback(
      () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
      [dispatch],
    )

    const marketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, inputTokenAssetId ?? ''),
    )

    const apy = useMemo(() => bnOrZero(yieldItem.rewardRate.total), [yieldItem.rewardRate.total])

    const estimatedYearlyEarnings = useMemo(
      () => bnOrZero(cryptoAmount).times(apy),
      [cryptoAmount, apy],
    )

    const estimatedYearlyEarningsFiat = useMemo(
      () => estimatedYearlyEarnings.times(marketData?.price ?? 0),
      [estimatedYearlyEarnings, marketData?.price],
    )

    const fiatAmount = useMemo(
      () =>
        bnOrZero(cryptoAmount)
          .times(marketData?.price ?? 0)
          .toFixed(2),
      [cryptoAmount, marketData?.price],
    )

    const hasAmount = bnOrZero(cryptoAmount).gt(0)
    const inputSymbol = inputToken?.symbol ?? ''

    const uniqueValidatorCount = balances ? balances.validatorAddresses.length : 0
    const shouldShowValidatorPicker = uniqueValidatorCount > 1

    const enterTabSelectedStyle = useMemo(
      () => ({
        color: 'blue.400',
        borderBottomColor: 'transparent',
        borderTopColor: 'blue.400',
        borderTopWidth: '3px',
        marginTop: '-1px',
      }),
      [],
    )

    const tabFocusStyle = useMemo(() => ({ boxShadow: 'none' }), [])
    const buttonHoverStyle = useMemo(() => ({ transform: 'translateY(-1px)', boxShadow: 'lg' }), [])

    const enterButtonDisabled = useMemo(
      () =>
        isConnected &&
        (isLoading ||
          !yieldItem.status.enter ||
          !cryptoAmount ||
          isBelowMinimum ||
          !!isQuoteLoading),
      [
        isConnected,
        isLoading,
        yieldItem.status.enter,
        cryptoAmount,
        isBelowMinimum,
        isQuoteLoading,
      ],
    )

    const exitButtonDisabled = useMemo(
      () => isConnected && (isLoading || !yieldItem.status.exit || !cryptoAmount),
      [isConnected, isLoading, yieldItem.status.exit, cryptoAmount],
    )

    const enterButtonText = useMemo(() => {
      if (isQuoteLoading) return translate('common.loading')
      if (isConnected) return translate('yieldXYZ.enter')
      return translate('common.connectWallet')
    }, [isQuoteLoading, isConnected, translate])

    const exitButtonText = useMemo(() => {
      if (isConnected) return translate('yieldXYZ.exit')
      return translate('common.connectWallet')
    }, [isConnected, translate])

    const handleEnterButtonClick = useMemo(
      () => (isConnected ? handleEnterClick : handleConnectWallet),
      [isConnected, handleEnterClick, handleConnectWallet],
    )

    const handleExitButtonClick = useMemo(
      () => (isConnected ? handleExitClick : handleConnectWallet),
      [isConnected, handleExitClick, handleConnectWallet],
    )

    const modalAssetSymbol = useMemo(
      () => (modalAction === 'enter' ? inputToken?.symbol ?? '' : yieldItem.token.symbol),
      [modalAction, inputToken?.symbol, yieldItem.token.symbol],
    )

    const enterTabDisabled = !yieldItem.status.enter
    const exitTabDisabled = !yieldItem.status.exit
    const enterTabOpacity = enterTabDisabled ? 0.5 : 1
    const exitTabOpacity = exitTabDisabled ? 0.5 : 1

    const isPreferredValidator = useMemo(
      () => (validatorMetadata as ValidatorDto | undefined)?.preferred === true,
      [validatorMetadata],
    )

    const validatorRewardRate = useMemo(() => {
      if (!validatorMetadata) return null
      if (!('rewardRate' in validatorMetadata)) return null
      const rate = (validatorMetadata as ValidatorDto).rewardRate?.total
      if (!rate) return null
      return (rate * 100).toFixed(2)
    }, [validatorMetadata])

    const apyDisplay = useMemo(() => `${apy.times(100).toFixed(2)}%`, [apy])

    const estimatedYearlyEarningsDisplay = useMemo(
      () => `${estimatedYearlyEarnings.decimalPlaces(4).toString()} ${inputSymbol}`,
      [estimatedYearlyEarnings, inputSymbol],
    )

    const estimatedEarningsMarginBottom = hasAmount ? 2 : 0

    const validatorPickerContent = useMemo(() => {
      if (!shouldShowValidatorPicker) return null

      return (
        <>
          <Box
            p={4}
            borderBottom='1px solid'
            borderColor='border.base'
            bg='background.surface.raised.base'
            _hover={{ bg: 'background.surface.raised.hover' }}
            cursor='pointer'
            onClick={handleOpenValidatorModal}
            transition='background 0.2s'
          >
            <Flex justify='space-between' align='center' gap={4}>
              <Flex align='center' gap={3}>
                {validatorMetadata ? (
                  <>
                    <Avatar
                      size='sm'
                      src={validatorMetadata.logoURI}
                      name={validatorMetadata.name}
                    />
                    <Box>
                      <Text fontWeight='bold' fontSize='sm'>
                        {validatorMetadata.name}
                      </Text>
                      <Flex gap={2} fontSize='xs' color='text.subtle'>
                        {isPreferredValidator && (
                          <Text color='blue.400' fontWeight='bold'>
                            {translate('yieldXYZ.preferred')}
                          </Text>
                        )}
                        {validatorRewardRate && (
                          <GradientApy>
                            {validatorRewardRate}% {translate('yieldXYZ.apr')}
                          </GradientApy>
                        )}
                      </Flex>
                    </Box>
                  </>
                ) : (
                  <Text fontWeight='bold' fontSize='sm'>
                    {translate('yieldXYZ.selectValidator')}
                  </Text>
                )}
              </Flex>
              {chevronDownIcon}
            </Flex>
          </Box>
          <YieldValidatorSelectModal
            isOpen={isValidatorModalOpen}
            onClose={handleCloseValidatorModal}
            validators={validators || []}
            onSelect={handleValidatorChange}
            balances={balances?.raw}
          />
        </>
      )
    }, [
      shouldShowValidatorPicker,
      handleOpenValidatorModal,
      validatorMetadata,
      isPreferredValidator,
      translate,
      validatorRewardRate,
      isValidatorModalOpen,
      handleCloseValidatorModal,
      validators,
      handleValidatorChange,
      balances?.raw,
    ])

    const minDepositContent = useMemo(() => {
      if (!minDeposit || isLoading) return null

      return (
        <Flex justifyContent='space-between' width='full' px={1}>
          <Flex gap={2} alignItems='center'>
            {moneyBillWaveIcon}
            <Text fontSize='xs' color='gray.500' fontWeight='medium'>
              {translate('yieldXYZ.minDeposit')}
            </Text>
          </Flex>
          <Text fontSize='xs' color={isBelowMinimum ? 'red.500' : 'gray.500'} fontWeight='bold'>
            {minDeposit} {inputToken?.symbol}
          </Text>
        </Flex>
      )
    }, [minDeposit, isLoading, translate, isBelowMinimum, inputToken?.symbol])

    const estimatedYearlyEarningsContent = useMemo(() => {
      if (!hasAmount) return null

      return (
        <Flex justify='space-between' align='center'>
          <Text fontSize='sm' color='text.subtle' fontWeight='medium'>
            {translate('yieldXYZ.estYearlyEarnings')}
          </Text>
          <Flex direction='column' align='flex-end'>
            <GradientApy fontSize='sm' fontWeight='bold'>
              {estimatedYearlyEarningsDisplay}
            </GradientApy>
            <Flex color='gray.500' fontWeight='normal' fontSize='xs'>
              <Amount.Fiat value={estimatedYearlyEarningsFiat.toString()} />
            </Flex>
          </Flex>
        </Flex>
      )
    }, [hasAmount, translate, estimatedYearlyEarningsDisplay, estimatedYearlyEarningsFiat])

    const enterTabPanelContent = useMemo(() => {
      if (isBalancesLoading) return <YieldEnterExitSkeleton />

      return (
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
      )
    }, [
      isBalancesLoading,
      accountId,
      inputTokenAssetId,
      inputToken?.symbol,
      yieldItem.metadata.logoURI,
      cryptoAmount,
      inputTokenBalance,
      handlePercentClick,
      handleMaxClick,
      fiatAmount,
    ])

    const exitTabPanelContent = useMemo(() => {
      if (isBalancesLoading) return <YieldEnterExitSkeleton />

      return (
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
      )
    }, [
      isBalancesLoading,
      accountId,
      inputTokenAssetId,
      yieldItem.token.symbol,
      yieldItem.metadata.logoURI,
      cryptoAmount,
      exitBalance,
      handlePercentClick,
      handleMaxClick,
      fiatAmount,
    ])

    return (
      <>
        <Box
          borderWidth='1px'
          borderColor='border.base'
          borderRadius='xl'
          bg='background.surface.overlay.base'
          overflow='hidden'
        >
          {validatorPickerContent}
          <Tabs
            index={tabIndex}
            onChange={setTabIndex}
            isFitted
            variant='enclosed'
            borderBottomWidth={0}
          >
            <TabList mb='0' borderBottom='1px solid' borderColor='border.base'>
              <Tab
                _selected={enterTabSelectedStyle}
                _focus={tabFocusStyle}
                fontWeight='bold'
                py={4}
                borderBottomWidth='1px'
                borderTopWidth='3px'
                borderTopColor='transparent'
                isDisabled={enterTabDisabled}
                opacity={enterTabOpacity}
              >
                {translate('yieldXYZ.enter')}
              </Tab>
              <Tab
                _selected={enterTabSelectedStyle}
                _focus={tabFocusStyle}
                fontWeight='bold'
                py={4}
                borderBottomWidth='1px'
                borderTopWidth='3px'
                borderTopColor='transparent'
                isDisabled={exitTabDisabled}
                opacity={exitTabOpacity}
              >
                {translate('yieldXYZ.exit')}
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel p={8}>
                <Flex direction='column' gap={2}>
                  {enterTabPanelContent}
                  {minDepositContent}
                  <Box
                    bg='background.surface.raised.base'
                    borderRadius='lg'
                    p={4}
                    border='1px solid'
                    borderColor='border.base'
                  >
                    <Flex justify='space-between' align='center' mb={estimatedEarningsMarginBottom}>
                      <Text fontSize='sm' color='text.subtle' fontWeight='medium'>
                        {translate('yieldXYZ.currentApy')}
                      </Text>
                      <GradientApy fontSize='sm' fontWeight='bold'>
                        {apyDisplay}
                      </GradientApy>
                    </Flex>
                    {estimatedYearlyEarningsContent}
                  </Box>
                  <Button
                    colorScheme='blue'
                    size='lg'
                    width='full'
                    height='56px'
                    fontSize='lg'
                    isDisabled={enterButtonDisabled}
                    onClick={handleEnterButtonClick}
                    _hover={buttonHoverStyle}
                  >
                    {enterButtonText}
                  </Button>
                </Flex>
              </TabPanel>
              <TabPanel p={8}>
                <Flex direction='column' gap={2}>
                  {exitTabPanelContent}
                  <Button
                    colorScheme='blue'
                    size='lg'
                    width='full'
                    height='56px'
                    fontSize='lg'
                    isDisabled={exitButtonDisabled}
                    onClick={handleExitButtonClick}
                    _hover={buttonHoverStyle}
                  >
                    {exitButtonText}
                  </Button>
                </Flex>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
        <YieldActionModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          yieldItem={yieldItem}
          action={modalAction}
          amount={cryptoAmount}
          assetSymbol={modalAssetSymbol}
          validatorAddress={selectedValidatorAddress}
        />
      </>
    )
  },
)
