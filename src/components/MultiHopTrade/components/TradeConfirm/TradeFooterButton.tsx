import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  CardFooter,
  Flex,
  Stack,
} from '@chakra-ui/react'
import { fromAccountId, starknetChainId } from '@shapeshiftoss/caip'
import type { SupportedTradeQuoteStepIndex, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { FC, JSX } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { ALLOWED_PRICE_IMPACT_PERCENTAGE_MEDIUM } from '../../utils/getPriceImpactColor'
import { getQuoteErrorTranslation } from '../TradeInput/getQuoteErrorTranslation'
import { isPermit2Hop } from './helpers'
import { useStreamingProgress } from './hooks/useStreamingProgress'
import { useTradeButtonProps } from './hooks/useTradeButtonProps'

import { WarningAcknowledgement } from '@/components/Acknowledgement/WarningAcknowledgement'
import { usePriceImpact } from '@/components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { chainSupportsTxHistory } from '@/components/MultiHopTrade/utils'
import { RawText, Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useModal } from '@/hooks/useModal/useModal'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { assertUnreachable } from '@/lib/utils'
import { selectPortfolioAccountMetadataByAccountId, selectSwapById } from '@/state/slices/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { selectFirstHopSellAccountId } from '@/state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectActiveQuoteErrors,
  selectActiveSwapperName,
  selectConfirmedTradeExecutionState,
  selectHopExecutionMetadata,
  selectLastHopBuyAsset,
  selectQuoteSellAmountUserCurrency,
  selectTotalNetworkFeeUserCurrency,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { TradeExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from '@/state/store'

type TradeFooterButtonProps = {
  tradeQuoteStep: TradeQuoteStep
  currentHopIndex: SupportedTradeQuoteStepIndex
  activeTradeId: string
  isExactAllowance: boolean
  isLoading?: boolean
}

export const TradeFooterButton: FC<TradeFooterButtonProps> = ({
  tradeQuoteStep,
  currentHopIndex,
  activeTradeId,
  isExactAllowance,
  isLoading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const deployStarknetAccount = useModal('deployStarknetAccount')
  const toast = useNotificationToast()
  const {
    state: { wallet },
  } = useWallet()
  const tradeButtonProps = useTradeButtonProps({
    tradeQuoteStep,
    currentHopIndex,
    activeTradeId,
    isExactAllowance,
  })
  const translate = useTranslate()
  const swapperName = useAppSelector(selectActiveSwapperName)
  const lastHopBuyAsset = useAppSelector(selectLastHopBuyAsset)
  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)
  const activeQuote = useAppSelector(selectActiveQuote)
  const sellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const accountMetadataFilter = useMemo(() => ({ accountId: sellAccountId }), [sellAccountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountMetadataFilter),
  )
  const { priceImpactPercentage } = usePriceImpact(activeQuote)
  const isModeratePriceImpact = priceImpactPercentage?.gte(ALLOWED_PRICE_IMPACT_PERCENTAGE_MEDIUM)

  const firstHopMetadata = useSelectorWithArgs(selectHopExecutionMetadata, {
    tradeId: activeQuote?.id ?? '',
    hopIndex: 0,
  })

  const secondHopMetadata = useSelectorWithArgs(selectHopExecutionMetadata, {
    tradeId: activeQuote?.id ?? '',
    hopIndex: 1,
  })
  const networkFeeUserCurrency = useAppSelector(selectTotalNetworkFeeUserCurrency)
  const sellAmountBeforeFeesUserCurrency = useAppSelector(selectQuoteSellAmountUserCurrency)
  const activeSwapId = useAppSelector(swapSlice.selectors.selectActiveSwapId)
  const swapByIdFilter = useMemo(() => {
    return {
      swapId: activeSwapId ?? '',
    }
  }, [activeSwapId])

  const activeSwap = useAppSelector(state => selectSwapById(state, swapByIdFilter))

  const streamingProgress = useStreamingProgress({
    swap: activeSwap,
  })

  const isPermit2 = useMemo(() => {
    return isPermit2Hop(tradeQuoteStep)
  }, [tradeQuoteStep])

  const translation: TextPropTypes['translation'] | undefined = useMemo(() => {
    if (!confirmedTradeExecutionState) return undefined
    switch (confirmedTradeExecutionState) {
      case TradeExecutionState.Initializing:
      case TradeExecutionState.Previewing:
        return 'trade.confirmAndTrade'
      case TradeExecutionState.FirstHop:
      case TradeExecutionState.SecondHop:
      case TradeExecutionState.TradeComplete:
        return tradeButtonProps?.buttonText
      default:
        assertUnreachable(confirmedTradeExecutionState)
    }
  }, [confirmedTradeExecutionState, tradeButtonProps?.buttonText])

  const networkFeeToTradeRatioPercentage = useMemo(
    () =>
      bnOrZero(networkFeeUserCurrency)
        .dividedBy(sellAmountBeforeFeesUserCurrency ?? 1)
        .times(100)
        .toNumber(),
    [networkFeeUserCurrency, sellAmountBeforeFeesUserCurrency],
  )

  // Reset the button loading state when the trade execution state changes
  useEffect(() => {
    setIsSubmitting(false)
  }, [firstHopMetadata.state, secondHopMetadata.state])

  const executeTradeSubmit = useCallback(async () => {
    await tradeButtonProps?.onSubmit()
  }, [tradeButtonProps])

  const handleSubmit = useCallback(async () => {
    try {
      setIsSubmitting(true)

      if (sellAccountId && wallet) {
        const { chainId } = fromAccountId(sellAccountId)
        if (chainId === starknetChainId) {
          const chainAdapterManager = getChainAdapterManager()
          const adapter = chainAdapterManager.get(chainId)
          if (adapter && 'isAccountDeployed' in adapter) {
            const fromAddress = fromAccountId(sellAccountId).account
            const isDeployed = await (adapter as any).isAccountDeployed(fromAddress)
            if (!isDeployed) {
              deployStarknetAccount.open({
                onConfirm: async () => {
                  try {
                    const feeData = await adapter.getFeeData({})
                    const maxFee = (feeData as any).fast.chainSpecific.maxFee

                    const accountNumber = accountMetadata?.bip44Params.accountNumber ?? 0

                    const deployTxHash = await (adapter as any).deployAccount({
                      accountNumber,
                      wallet,
                      maxFee,
                    })

                    if (!deployTxHash) {
                      toast({
                        status: 'error',
                        title: 'Failed to deploy account',
                        description: 'Could not deploy Starknet account',
                      })
                      return
                    }

                    toast({
                      status: 'info',
                      title: 'Deploying account...',
                      description: 'Waiting for account deployment to be confirmed',
                      duration: null,
                    })

                    const starknetProvider = (adapter as any).getStarknetProvider()
                    await starknetProvider.waitForTransaction(deployTxHash, {
                      retryInterval: 2000,
                      successStates: ['ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'],
                    })

                    toast({
                      status: 'success',
                      title: 'Account deployed',
                      description: 'Your Starknet account has been deployed successfully',
                      duration: 3000,
                    })

                    // Wait a moment for the nonce to update before proceeding with swap
                    await new Promise(resolve => setTimeout(resolve, 2000))

                    await executeTradeSubmit()
                  } catch (error) {
                    console.error('Failed to deploy Starknet account:', error)
                    toast({
                      status: 'error',
                      title: 'Deployment failed',
                      description: error instanceof Error ? error.message : 'Unknown error',
                    })
                  }
                },
                onCancel: () => {},
              })
              return
            }
          }
        }
      }

      await executeTradeSubmit()
    } finally {
      setIsSubmitting(false)
    }
  }, [
    executeTradeSubmit,
    sellAccountId,
    wallet,
    deployStarknetAccount,
    toast,
    accountMetadata?.bip44Params.accountNumber,
  ])

  const handleClick = useCallback(() => {
    const isInitializingOrPreviewing =
      confirmedTradeExecutionState === TradeExecutionState.Initializing ||
      confirmedTradeExecutionState === TradeExecutionState.Previewing
    // Only show the warning acknowledgement if the user is previewing the trade
    if (isModeratePriceImpact && isInitializingOrPreviewing) {
      setShouldShowWarningAcknowledgement(true)
    } else {
      handleSubmit()
    }
  }, [isModeratePriceImpact, handleSubmit, confirmedTradeExecutionState])

  // Ratio of the fiat value of the gas fee to the fiat value of the trade value express in percentage
  const isFeeRatioOverThreshold = useMemo(() => {
    const networkFeeToTradeRatioPercentageThreshold = 5
    return networkFeeToTradeRatioPercentage > networkFeeToTradeRatioPercentageThreshold
  }, [networkFeeToTradeRatioPercentage])

  const gasFeeExceedsTradeAmountThresholdTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      'trade.gasFeeExceedsTradeAmountThreshold',
      { percentage: networkFeeToTradeRatioPercentage.toFixed(0) },
    ],
    [networkFeeToTradeRatioPercentage],
  )

  const tradeWarnings: JSX.Element | null = useMemo(() => {
    const isSlowSwapper =
      swapperName &&
      [SwapperName.Thorchain, SwapperName.CowSwap, SwapperName.Mayachain].includes(swapperName)

    const isTxHistorySupportedForChain =
      lastHopBuyAsset && chainSupportsTxHistory(lastHopBuyAsset.chainId)

    const shouldRenderWarnings = isSlowSwapper || !isTxHistorySupportedForChain

    if (!shouldRenderWarnings) return null

    return (
      <Flex direction='column' gap={2}>
        {isSlowSwapper && (
          <Alert status='info' width='auto' fontSize='sm'>
            <AlertIcon />
            <Stack spacing={0}>
              <AlertTitle>{translate('trade.slowSwapTitle', { protocol: swapperName })}</AlertTitle>
              <AlertDescription lineHeight='short'>
                {translate('trade.slowSwapBody')}
              </AlertDescription>
            </Stack>
          </Alert>
        )}
        {!isTxHistorySupportedForChain && (
          <Alert status='info' width='auto' mb={3} fontSize='sm'>
            <AlertIcon />
            <Stack spacing={0}>
              <AlertDescription lineHeight='short'>
                {translate('trade.intoAssetSymbolBody', {
                  assetSymbol: lastHopBuyAsset?.symbol,
                })}
              </AlertDescription>
            </Stack>
          </Alert>
        )}
        {isFeeRatioOverThreshold && (
          <Alert status='warning' size='sm'>
            <AlertIcon />
            <AlertDescription>
              <Text translation={gasFeeExceedsTradeAmountThresholdTranslation} />
            </AlertDescription>
          </Alert>
        )}
      </Flex>
    )
  }, [
    swapperName,
    lastHopBuyAsset,
    translate,
    isFeeRatioOverThreshold,
    gasFeeExceedsTradeAmountThresholdTranslation,
  ])

  const activeQuoteErrors = useAppSelector(selectActiveQuoteErrors)
  const activeQuoteError = useMemo(() => activeQuoteErrors?.[0], [activeQuoteErrors])

  const isButtonLoading = useMemo(() => {
    if (!confirmedTradeExecutionState) return true

    return (
      isSubmitting ||
      confirmedTradeExecutionState === TradeExecutionState.Initializing ||
      tradeButtonProps?.isLoading ||
      isLoading ||
      (swapperName === SwapperName.Zrx &&
        isPermit2 &&
        !tradeQuoteStep?.permit2Eip712 &&
        ![TradeExecutionState.Initializing, TradeExecutionState.Previewing].includes(
          confirmedTradeExecutionState,
        ) &&
        !activeQuoteError)
    )
  }, [
    isSubmitting,
    confirmedTradeExecutionState,
    tradeButtonProps?.isLoading,
    isLoading,
    isPermit2,
    activeQuoteError,
    tradeQuoteStep?.permit2Eip712,
    swapperName,
  ])

  if (!confirmedTradeExecutionState || !translation || !tradeButtonProps) return null

  return (
    <>
      <WarningAcknowledgement
        message={translate('warningAcknowledgement.highSlippageTrade', {
          slippagePercentage: bnOrZero(priceImpactPercentage).toFixed(2).toString(),
        })}
        onAcknowledge={handleSubmit}
        shouldShowAcknowledgement={shouldShowWarningAcknowledgement}
        setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
      />
      <CardFooter flexDir='column' gap={2} px={3} pb={0} borderTop='none'>
        {[TradeExecutionState.Initializing, TradeExecutionState.Previewing].includes(
          confirmedTradeExecutionState,
        ) && tradeWarnings}
        {activeQuoteError && (
          <Alert status='warning' size='sm'>
            <AlertIcon />
            <AlertDescription>
              <Text translation={getQuoteErrorTranslation(activeQuoteError)} />
            </AlertDescription>
          </Alert>
        )}
        {streamingProgress && streamingProgress.failedSwaps.length > 0 && (
          <Alert status='warning' size='sm'>
            <AlertIcon />
            <AlertDescription>
              <RawText>
                {translate('trade.swapsFailed', {
                  failedSwaps: streamingProgress.failedSwaps.length,
                })}
              </RawText>
            </AlertDescription>
          </Alert>
        )}
        <Button
          colorScheme={!!activeQuoteError ? 'red' : 'blue'}
          size='lg'
          width='full'
          onClick={handleClick}
          isLoading={isButtonLoading}
          isDisabled={tradeButtonProps.isDisabled || !!activeQuoteError}
        >
          <Text translation={translation} />
        </Button>
      </CardFooter>
    </>
  )
}
