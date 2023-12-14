import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, Card, CardBody, Link, Tooltip, VStack } from '@chakra-ui/react'
import type { SwapperName, TradeQuoteStep } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type Polyglot from 'node-polyglot'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'
import { THORCHAIN_STREAM_SWAP_SOURCE } from 'lib/swapper/swappers/ThorchainSwapper/constants'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { SwapperIcon } from '../../TradeInput/components/SwapperIcon/SwapperIcon'
import { useTradeExecution } from '../hooks/useTradeExecution'
import { TradeType } from '../types'
import { getChainShortName } from '../utils/getChainShortName'
import { StatusIcon } from './StatusIcon'
import { StepperStep } from './StepperStep'
import { StreamingSwap } from './StreamingSwap'

export type HopTransactionStepProps = {
  swapperName: SwapperName
  tradeQuoteStep: TradeQuoteStep
  isActive: boolean
  hopIndex: number
  isLastStep?: boolean
}

export const HopTransactionStep = ({
  swapperName,
  tradeQuoteStep,
  isActive,
  hopIndex,
  isLastStep,
}: HopTransactionStepProps) => {
  const {
    number: { toCrypto },
  } = useLocaleFormatter()
  const translate = useTranslate()

  const {
    swap: { state: swapTxState, sellTxHash, buyTxHash, message },
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopIndex))

  const isError = useMemo(() => swapTxState === TransactionExecutionState.Failed, [swapTxState])

  const executeTrade = useTradeExecution(hopIndex)

  const handleSignTx = useCallback(async () => {
    if (swapTxState !== TransactionExecutionState.AwaitingConfirmation) {
      console.error('attempted to execute in-progress swap')
      return
    }

    await executeTrade()
  }, [executeTrade, swapTxState])

  const tradeType = useMemo(
    () =>
      tradeQuoteStep.buyAsset.chainId === tradeQuoteStep.sellAsset.chainId
        ? TradeType.Swap
        : TradeType.Bridge,
    [tradeQuoteStep.buyAsset.chainId, tradeQuoteStep.sellAsset.chainId],
  )

  const { txLink, txHash } = useMemo(() => {
    if (buyTxHash)
      return {
        txLink: getTxLink({
          name: tradeQuoteStep.source,
          defaultExplorerBaseUrl: tradeQuoteStep.sellAsset.explorerTxLink,
          tradeId: buyTxHash,
        }),
        txHash: buyTxHash,
      }
    if (sellTxHash)
      return {
        txLink: getTxLink({
          name: tradeQuoteStep.source,
          defaultExplorerBaseUrl: tradeQuoteStep.sellAsset.explorerTxLink,
          tradeId: sellTxHash,
        }),
        txHash: sellTxHash,
      }

    return {}
  }, [buyTxHash, tradeQuoteStep.source, tradeQuoteStep.sellAsset.explorerTxLink, sellTxHash])

  const stepIndicator = useMemo(() => {
    const defaultIcon = <SwapperIcon swapperName={swapperName} />
    // eslint too stoopid to realize this is inside the context of useMemo already
    // eslint-disable-next-line react-memo/require-usememo
    return <StatusIcon txStatus={swapTxState} defaultIcon={defaultIcon} />
  }, [swapTxState, swapperName])

  const signIcon = useMemo(() => <CheckCircleIcon />, [])

  const content = useMemo(() => {
    if (isActive && swapTxState === TransactionExecutionState.AwaitingConfirmation) {
      return (
        <Card width='full'>
          <CardBody px={2} py={2}>
            <Button colorScheme='blue' size='sm' leftIcon={signIcon} onClick={handleSignTx}>
              {translate('common.signTransaction')}
            </Button>
          </CardBody>
        </Card>
      )
    }

    const isThorStreamingSwap = tradeQuoteStep.source === THORCHAIN_STREAM_SWAP_SOURCE

    if (sellTxHash !== undefined && isThorStreamingSwap) {
      return (
        <Card width='full'>
          <CardBody px={2} py={2}>
            <StreamingSwap hopIndex={hopIndex} />
          </CardBody>
        </Card>
      )
    }
  }, [
    handleSignTx,
    hopIndex,
    isActive,
    sellTxHash,
    signIcon,
    swapTxState,
    tradeQuoteStep.source,
    translate,
  ])

  const errorTranslation = useMemo(
    (): [string, Polyglot.InterpolationOptions] => ['trade.swapFailed', { tradeType }],
    [tradeType],
  )

  const description = useMemo(() => {
    const sellChainSymbol = getChainShortName(tradeQuoteStep.sellAsset.chainId as KnownChainIds)
    const buyChainSymbol = getChainShortName(tradeQuoteStep.buyAsset.chainId as KnownChainIds)

    const sellAmountCryptoPrecision = fromBaseUnit(
      tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      tradeQuoteStep.sellAsset.precision,
    )
    const buyAmountCryptoPrecision = fromBaseUnit(
      tradeQuoteStep.buyAmountBeforeFeesCryptoBaseUnit,
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
        {isError && <Text color='text.error' translation={errorTranslation} fontWeight='bold' />}
        {Boolean(message) && (
          <Tooltip label={message}>
            <RawText color='text.subtle'>{message}</RawText>
          </Tooltip>
        )}
        {txLink && (
          <Link isExternal color='text.link' href={txLink}>
            <MiddleEllipsis value={txHash} />
          </Link>
        )}
      </VStack>
    )
  }, [
    errorTranslation,
    isError,
    message,
    toCrypto,
    tradeQuoteStep.buyAmountBeforeFeesCryptoBaseUnit,
    tradeQuoteStep.buyAsset.chainId,
    tradeQuoteStep.buyAsset.precision,
    tradeQuoteStep.buyAsset.symbol,
    tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    tradeQuoteStep.sellAsset.chainId,
    tradeQuoteStep.sellAsset.precision,
    tradeQuoteStep.sellAsset.symbol,
    txHash,
    txLink,
  ])

  const title = useMemo(() => {
    const chainAdapterManager = getChainAdapterManager()
    const sellChainName = chainAdapterManager
      .get(tradeQuoteStep.sellAsset.chainId)
      ?.getDisplayName()
    const buyChainName = chainAdapterManager.get(tradeQuoteStep.buyAsset.chainId)?.getDisplayName()

    return tradeType === TradeType.Swap
      ? `${tradeType} on ${sellChainName} via ${swapperName}`
      : `${tradeType} from ${sellChainName} to ${buyChainName} via ${swapperName}`
  }, [swapperName, tradeQuoteStep.buyAsset.chainId, tradeQuoteStep.sellAsset.chainId, tradeType])

  return (
    <StepperStep
      title={title}
      description={description}
      stepIndicator={stepIndicator}
      content={content}
      isLastStep={isLastStep}
      isError={swapTxState === TransactionExecutionState.Failed}
    />
  )
}
