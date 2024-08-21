import { Button, Card, CardBody, Link, Tooltip, VStack } from '@chakra-ui/react'
import type {
  SupportedTradeQuoteStepIndex,
  TradeQuote,
  TradeQuoteStep,
} from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/constants'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'
import {
  selectHopExecutionMetadata,
  selectHopSellAccountId,
} from 'state/slices/tradeQuoteSlice/selectors'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { SwapperIcon } from '../../TradeInput/components/SwapperIcon/SwapperIcon'
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

  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp()

  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex,
    }
  }, [activeTradeId, hopIndex])

  const {
    swap: { state: swapTxState, sellTxHash, buyTxHash, message },
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopExecutionMetadataFilter))

  const isError = useMemo(() => swapTxState === TransactionExecutionState.Failed, [swapTxState])

  const executeTrade = useTradeExecution(hopIndex, activeTradeId)

  const handleSignTx = useCallback(async () => {
    if (swapTxState !== TransactionExecutionState.AwaitingConfirmation) {
      console.error('attempted to execute in-progress swap')
      return
    }

    // Only proceed to execute the trade if the promise is resolved, i.e the user has opened the
    // Ledger app without cancelling
    await checkLedgerAppOpenIfLedgerConnected(tradeQuoteStep.sellAsset.chainId)
      .then(() => executeTrade())
      .catch(console.error)
  }, [
    checkLedgerAppOpenIfLedgerConnected,
    executeTrade,
    swapTxState,
    tradeQuoteStep.sellAsset.chainId,
  ])

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

  const { data: safeTx } = useSafeTxQuery({
    maybeSafeTxHash: sellTxHash,
    chainId: tradeQuoteStep.sellAsset.chainId,
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
          isSafeTxHash: false,
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
          isSafeTxHash: Boolean(safeTx?.isSafeTxHash),
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
    safeTx?.isSafeTxHash,
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

  const content = useMemo(() => {
    if (isActive && swapTxState === TransactionExecutionState.AwaitingConfirmation) {
      return (
        <Card width='full'>
          <CardBody px={2} py={2}>
            <Button colorScheme='blue' size='sm' onClick={handleSignTx} width='100%'>
              {translate('common.signTransaction')}
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
    handleSignTx,
    hopIndex,
    isActive,
    sellTxHash,
    swapTxState,
    activeTradeId,
    tradeQuoteStep.source,
    translate,
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
        {Boolean(message) && (
          <Tooltip label={message}>
            <RawText color='text.subtle'>{message}</RawText>
          </Tooltip>
        )}
        {txLinks.map(({ txLink, txHash }) => (
          <Link isExternal color='text.link' href={txLink} key={txHash}>
            <MiddleEllipsis value={txHash} />
          </Link>
        ))}
      </VStack>
    )
  }, [
    isBridge,
    isError,
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
