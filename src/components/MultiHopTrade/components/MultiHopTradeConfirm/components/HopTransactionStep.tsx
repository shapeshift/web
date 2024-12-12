import { Button, Card, CardBody, Link, VStack } from '@chakra-ui/react'
import type {
  SupportedTradeQuoteStepIndex,
  TradeQuote,
  TradeQuoteStep,
} from '@shapeshiftoss/swapper'
import { isToken, SwapperName } from '@shapeshiftoss/swapper'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/constants'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'
import {
  selectFeeAssetByChainId,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import {
  selectActiveQuoteErrors,
  selectHopExecutionMetadata,
  selectHopSellAccountId,
} from 'state/slices/tradeQuoteSlice/selectors'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { SwapperIcon } from '../../TradeInput/components/SwapperIcon/SwapperIcon'
import { getQuoteErrorTranslation } from '../../TradeInput/getQuoteErrorTranslation'
import { useTradeExecution } from '../hooks/useTradeExecution'
import { getChainShortName } from '../utils/getChainShortName'
import { StatusIcon } from './StatusIcon'
import { StepperStep } from './StepperStep'
import { StreamingSwap } from './StreamingSwap'

export type HopTransactionStepProps = {
  swapperName: SwapperName
  tradeQuoteStep: TradeQuoteStep
  isActive: boolean
  hopIndex: SupportedTradeQuoteStepIndex
  isLastStep?: boolean
  activeTradeId: TradeQuote['id']
}

export const HopTransactionStep = ({
  swapperName,
  tradeQuoteStep,
  isActive,
  hopIndex,
  isLastStep,
  activeTradeId,
}: HopTransactionStepProps) => {
  const {
    number: { toCrypto },
  } = useLocaleFormatter()
  const translate = useTranslate()

  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex,
    }
  }, [activeTradeId, hopIndex])

  const {
    swap: { state: swapTxState, sellTxHash, buyTxHash, message },
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopExecutionMetadataFilter))

  const activeQuoteErrors = useAppSelector(selectActiveQuoteErrors)
  const activeQuoteError = useMemo(() => activeQuoteErrors?.[0], [activeQuoteErrors])

  // An error can be either an execution error, or an error returned when attempting to get the final quote
  const isError = useMemo(() => swapTxState === TransactionExecutionState.Failed, [swapTxState])
  const isQuoteError = useMemo(() => !!activeQuoteError, [activeQuoteError])

  const executeTrade = useTradeExecution(hopIndex, activeTradeId)

  const handleSignTx = useCallback(() => {
    if (swapTxState !== TransactionExecutionState.AwaitingConfirmation) {
      console.error('attempted to execute in-progress swap')
      return
    }

    executeTrade()
  }, [executeTrade, swapTxState])

  const isBridge = useMemo(
    () => tradeQuoteStep.buyAsset.chainId !== tradeQuoteStep.sellAsset.chainId,
    [tradeQuoteStep.buyAsset.chainId, tradeQuoteStep.sellAsset.chainId],
  )

  const hopSellAccountIdFilter = useMemo(
    () => ({
      hopIndex,
    }),
    [hopIndex],
  )
  const sellAssetAccountId = useAppSelector(state =>
    selectHopSellAccountId(state, hopSellAccountIdFilter),
  )

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: sellTxHash,
    accountId: sellAssetAccountId,
  })

  const txLinks = useMemo(() => {
    const txLinks = []
    if (buyTxHash) {
      txLinks.push({
        txLink: getTxLink({
          name: tradeQuoteStep.source,
          defaultExplorerBaseUrl: tradeQuoteStep.buyAsset.explorerTxLink,
          txId: buyTxHash,
          // Assume buy TxHash can never be a user SAFE hash
          maybeSafeTx: undefined,
          accountId: sellAssetAccountId,
        }),
        txHash: buyTxHash,
      })
    }

    if (sellTxHash && sellTxHash !== buyTxHash) {
      txLinks.push({
        txLink: getTxLink({
          name: tradeQuoteStep.source,
          defaultExplorerBaseUrl: tradeQuoteStep.sellAsset.explorerTxLink,
          accountId: sellAssetAccountId,
          maybeSafeTx,
          ...(tradeQuoteStep.source === SwapperName.CowSwap
            ? {
                tradeId: sellTxHash,
              }
            : {
                txId: sellTxHash,
              }),
        }),
        txHash: sellTxHash,
      })
    }

    return txLinks
  }, [
    buyTxHash,
    maybeSafeTx,
    sellAssetAccountId,
    sellTxHash,
    tradeQuoteStep.buyAsset.explorerTxLink,
    tradeQuoteStep.sellAsset.explorerTxLink,
    tradeQuoteStep.source,
  ])

  const stepIndicator = useMemo(() => {
    const defaultIcon = <SwapperIcon swapperName={swapperName} />
    // eslint too stoopid to realize this is inside the context of useMemo already
    // eslint-disable-next-line react-memo/require-usememo
    return <StatusIcon txStatus={swapTxState} defaultIcon={defaultIcon} />
  }, [swapTxState, swapperName])

  const { isFetching, data: tradeQuoteQueryData } = useGetTradeQuotes()

  const feeAsset = useSelectorWithArgs(
    selectFeeAssetByChainId,
    tradeQuoteStep?.sellAsset.chainId ?? '',
  )
  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId ?? '', accountId: sellAssetAccountId ?? '' }),
    [feeAsset?.assetId, sellAssetAccountId],
  )
  const feeAssetBalance = useSelectorWithArgs(
    selectPortfolioCryptoBalanceBaseUnitByFilter,
    feeAssetBalanceFilter,
  )

  const hasEnoughNativeAssetBalance = useMemo(() => {
    // No quote, no error
    if (!tradeQuoteStep) return true

    const nativeAssetValueCryptoBaseUnit = bnOrZero(
      isToken(tradeQuoteStep.sellAsset.assetId)
        ? undefined
        : tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    )

    const {
      feeData: { networkFeeCryptoBaseUnit },
    } = tradeQuoteStep

    // This should not happen at final quote time but we need to content TS
    if (!networkFeeCryptoBaseUnit) return true

    return bn(feeAssetBalance).gte(nativeAssetValueCryptoBaseUnit.plus(networkFeeCryptoBaseUnit))
  }, [feeAssetBalance, tradeQuoteStep])

  const signButtonCopy = useMemo(() => {
    if (!hasEnoughNativeAssetBalance)
      return translate('modals.send.errors.notEnoughNativeToken', {
        asset: feeAsset!.symbol,
      })

    return translate('common.signTransaction')
  }, [feeAsset, hasEnoughNativeAssetBalance, translate])

  const content = useMemo(() => {
    if (isActive && swapTxState === TransactionExecutionState.AwaitingConfirmation) {
      return (
        <Card width='full'>
          <CardBody px={2} py={2}>
            <Button
              colorScheme={hasEnoughNativeAssetBalance ? 'blue' : 'red'}
              size='sm'
              onClick={handleSignTx}
              isLoading={isFetching}
              isDisabled={!tradeQuoteQueryData || isQuoteError || !hasEnoughNativeAssetBalance}
              width='100%'
            >
              {signButtonCopy}
            </Button>
          </CardBody>
        </Card>
      )
    }

    const isThorStreamingSwap = [
      THORCHAIN_STREAM_SWAP_SOURCE,
      THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
    ].includes(tradeQuoteStep.source)

    if (sellTxHash !== undefined && isThorStreamingSwap) {
      return (
        <Card width='full'>
          <CardBody px={2} py={2}>
            <StreamingSwap hopIndex={hopIndex} activeTradeId={activeTradeId} />
          </CardBody>
        </Card>
      )
    }
  }, [
    isActive,
    swapTxState,
    tradeQuoteStep.source,
    sellTxHash,
    hasEnoughNativeAssetBalance,
    handleSignTx,
    isFetching,
    tradeQuoteQueryData,
    signButtonCopy,
    isQuoteError,
    hopIndex,
    activeTradeId,
  ])

  const description = useMemo(() => {
    const sellChainSymbol = getChainShortName(tradeQuoteStep.sellAsset.chainId as KnownChainIds)
    const buyChainSymbol = getChainShortName(tradeQuoteStep.buyAsset.chainId as KnownChainIds)

    const sellAmountCryptoPrecision = fromBaseUnit(
      tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      tradeQuoteStep.sellAsset.precision,
    )
    const buyAmountCryptoPrecision = fromBaseUnit(
      tradeQuoteStep.buyAmountAfterFeesCryptoBaseUnit,
      tradeQuoteStep.buyAsset.precision,
    )
    const sellAmountCryptoFormatted = toCrypto(
      sellAmountCryptoPrecision,
      tradeQuoteStep.sellAsset.symbol,
    )
    const buyAmountCryptoFormatted = toCrypto(
      buyAmountCryptoPrecision,
      tradeQuoteStep.buyAsset.symbol,
    )

    return (
      <VStack alignItems='flex-start'>
        <RawText>
          {`${sellAmountCryptoFormatted}.${sellChainSymbol} -> ${buyAmountCryptoFormatted}.${buyChainSymbol}`}
        </RawText>
        {isError && (
          <Text
            color='text.error'
            translation={
              isBridge ? 'trade.transactionFailed.bridge' : 'trade.transactionFailed.swap'
            }
            fontWeight='bold'
          />
        )}
        {isQuoteError && (
          <Text
            color='text.error'
            translation={getQuoteErrorTranslation(activeQuoteError!)}
            fontWeight='bold'
          />
        )}
        {message && <Text translation={message} color='text.subtle' />}
        {txLinks.map(({ txLink, txHash }) => (
          <Link isExternal color='text.link' href={txLink} key={txHash}>
            <MiddleEllipsis value={txHash} />
          </Link>
        ))}
      </VStack>
    )
  }, [
    activeQuoteError,
    isBridge,
    isError,
    isQuoteError,
    message,
    toCrypto,
    tradeQuoteStep.buyAmountAfterFeesCryptoBaseUnit,
    tradeQuoteStep.buyAsset.chainId,
    tradeQuoteStep.buyAsset.precision,
    tradeQuoteStep.buyAsset.symbol,
    tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    tradeQuoteStep.sellAsset.chainId,
    tradeQuoteStep.sellAsset.precision,
    tradeQuoteStep.sellAsset.symbol,
    txLinks,
  ])

  const title = useMemo(() => {
    const chainAdapterManager = getChainAdapterManager()
    const sellChainName = chainAdapterManager
      .get(tradeQuoteStep.sellAsset.chainId)
      ?.getDisplayName()
    const buyChainName = chainAdapterManager.get(tradeQuoteStep.buyAsset.chainId)?.getDisplayName()

    return isBridge
      ? translate('trade.transactionTitle.bridge', { sellChainName, buyChainName, swapperName })
      : translate('trade.transactionTitle.swap', { sellChainName, swapperName })
  }, [
    isBridge,
    swapperName,
    tradeQuoteStep.buyAsset.chainId,
    tradeQuoteStep.sellAsset.chainId,
    translate,
  ])

  return (
    <StepperStep
      title={title}
      description={description}
      stepIndicator={stepIndicator}
      content={content}
      isLastStep={isLastStep}
      isError={swapTxState === TransactionExecutionState.Failed}
      isPending={swapTxState === TransactionExecutionState.Pending}
    />
  )
}
