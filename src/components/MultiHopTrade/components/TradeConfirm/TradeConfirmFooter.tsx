import { ExternalLinkIcon } from '@chakra-ui/icons'
import { HStack, Icon, Link, Skeleton, Stack, Switch } from '@chakra-ui/react'
import { mayachainChainId, thorchainChainId } from '@shapeshiftoss/caip'
import { isGridPlus } from '@shapeshiftoss/hdwallet-gridplus'
import { isKeepKey } from '@shapeshiftoss/hdwallet-keepkey'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { isTrezor } from '@shapeshiftoss/hdwallet-trezor'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { SwapperName, TransactionExecutionState } from '@shapeshiftoss/swapper'
import type { FC } from 'react'
import { useMemo } from 'react'
import { TbArrowsSplit2 } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { SharedConfirmFooter } from '../SharedConfirm/SharedConfirmFooter'
import { TradeConfirmSummary } from './components/TradeConfirmSummary'
import { isPermit2Hop, StepperStep } from './helpers'
import { useActiveTradeAllowance } from './hooks/useActiveTradeAllowance'
import { useCurrentHopIndex } from './hooks/useCurrentHopIndex'
import { useStepperSteps } from './hooks/useStepperSteps'
import { useTradeNetworkFeeCryptoBaseUnit } from './hooks/useTradeNetworkFeeCryptoBaseUnit'
import { TradeFooterButton } from './TradeFooterButton'

import { Amount } from '@/components/Amount/Amount'
import { DepositAddressRow } from '@/components/DepositAddressRow'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { ReceiveAddressRow } from '@/components/ReceiveAddressRow'
import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { middleEllipsis } from '@/lib/utils'
import { selectAssetById, selectFeeAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import {
  selectInputBuyAsset,
  selectSellAssetUtxoChangeAddress,
} from '@/state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectHopExecutionMetadata,
  selectIsActiveSwapperQuoteLoading,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from '@/state/store'

type TradeConfirmFooterProps = {
  tradeQuoteStep: TradeQuoteStep
  activeTradeId: string
  isCompact: boolean | undefined
}

export const TradeConfirmFooter: FC<TradeConfirmFooterProps> = ({
  tradeQuoteStep,
  activeTradeId,
}) => {
  const [isExactAllowance, toggleIsExactAllowance] = useToggle(true)
  const translate = useTranslate()
  const {
    state: { wallet },
  } = useWallet()
  const { currentTradeStep } = useStepperSteps()
  const currentHopIndex = useCurrentHopIndex()
  const quoteNetworkFeeCryptoBaseUnit = tradeQuoteStep.feeData.networkFeeCryptoBaseUnit
  const feeAsset = useSelectorWithArgs(selectFeeAssetById, tradeQuoteStep.sellAsset.assetId)
  const sellAsset = useSelectorWithArgs(selectAssetById, tradeQuoteStep.sellAsset.assetId)
  const quoteNetworkFeeCryptoPrecision = fromBaseUnit(
    quoteNetworkFeeCryptoBaseUnit,
    feeAsset?.precision ?? 0,
  )
  const feeAssetUserCurrencyRate = useSelectorWithArgs(
    selectMarketDataByAssetIdUserCurrency,
    feeAsset?.assetId ?? '',
  )
  const isActiveSwapperQuoteLoading = useAppSelector(selectIsActiveSwapperQuoteLoading)
  const sellChainFeeAsset = useSelectorWithArgs(
    selectFeeAssetById,
    tradeQuoteStep.sellAsset.assetId,
  )

  const {
    allowanceResetNetworkFeeCryptoBaseUnit,
    approvalNetworkFeeCryptoBaseUnit,
    isAllowanceResetLoading,
    isAllowanceApprovalLoading,
  } = useActiveTradeAllowance({
    tradeQuoteStep,
    isExactAllowance,
    activeTradeId,
  })
  const activeQuote = useAppSelector(selectActiveQuote)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const receiveAddress = activeQuote?.receiveAddress

  const hopExecutionMetadataFilter = useMemo(() => {
    if (!activeTradeId) return undefined

    return {
      tradeId: activeTradeId,
      hopIndex: currentHopIndex,
    }
  }, [activeTradeId, currentHopIndex])

  const hopExecutionMetadata = useAppSelector(state =>
    hopExecutionMetadataFilter
      ? selectHopExecutionMetadata(state, hopExecutionMetadataFilter)
      : undefined,
  )

  const maybeUtxoChangeAddress = useAppSelector(selectSellAssetUtxoChangeAddress)

  const isHardwareWallet = useMemo(() => {
    return (
      wallet && (isLedger(wallet) || isGridPlus(wallet) || isTrezor(wallet) || isKeepKey(wallet))
    )
  }, [wallet])

  const maybeDepositAddress = useMemo(() => {
    if (!isHardwareWallet) return undefined

    const isThorchainOrMaya =
      tradeQuoteStep.source === SwapperName.Thorchain ||
      tradeQuoteStep.source === SwapperName.Mayachain ||
      tradeQuoteStep.source?.startsWith(`${SwapperName.Thorchain} •`) ||
      tradeQuoteStep.source?.startsWith(`${SwapperName.Mayachain} •`)

    const isNativeChainDeposit =
      tradeQuoteStep.sellAsset.chainId === thorchainChainId ||
      tradeQuoteStep.sellAsset.chainId === mayachainChainId

    if (isThorchainOrMaya) {
      if (isNativeChainDeposit) return undefined
      return hopExecutionMetadata?.swap?.inboundAddress
    }

    return (
      tradeQuoteStep.chainflipSpecific?.chainflipDepositAddress ??
      tradeQuoteStep.nearIntentsSpecific?.depositAddress ??
      tradeQuoteStep.relayTransactionMetadata?.to ??
      tradeQuoteStep.bebopTransactionMetadata?.to ??
      tradeQuoteStep.butterSwapTransactionMetadata?.to ??
      tradeQuoteStep.portalsTransactionMetadata?.to ??
      tradeQuoteStep.zrxTransactionMetadata?.to
    )
  }, [isHardwareWallet, tradeQuoteStep, hopExecutionMetadata?.swap?.inboundAddress])

  const {
    isLoading: isNetworkFeeCryptoBaseUnitLoading,
    isRefetching: isNetworkFeeCryptoBaseUnitRefetching,
    data: networkFeeCryptoBaseUnit,
  } = useTradeNetworkFeeCryptoBaseUnit({
    hopIndex: currentHopIndex,
    enabled:
      (currentTradeStep === StepperStep.FirstHopSwap ||
        currentTradeStep === StepperStep.LastHopSwap) &&
      // Stop fetching once the Tx is executed for this step
      hopExecutionMetadata?.state === HopExecutionState.AwaitingSwap &&
      hopExecutionMetadata?.swap?.state === TransactionExecutionState.AwaitingConfirmation,
  })

  const networkFeeCryptoPrecision = useMemo(() => {
    if (!networkFeeCryptoBaseUnit) return quoteNetworkFeeCryptoPrecision

    return fromBaseUnit(networkFeeCryptoBaseUnit, feeAsset?.precision ?? 0)
  }, [networkFeeCryptoBaseUnit, feeAsset?.precision, quoteNetworkFeeCryptoPrecision])

  const networkFeeUserCurrency = useMemo(() => {
    return bnOrZero(networkFeeCryptoPrecision)
      .times(bnOrZero(feeAssetUserCurrencyRate?.price))
      .toFixed()
  }, [networkFeeCryptoPrecision, feeAssetUserCurrencyRate?.price])

  const allowanceResetNetworkFeeCryptoPrecision = fromBaseUnit(
    allowanceResetNetworkFeeCryptoBaseUnit,
    sellChainFeeAsset?.precision ?? 0,
  )

  const allowanceResetNetworkFeeUserCurrency = bnOrZero(allowanceResetNetworkFeeCryptoPrecision)
    .times(bnOrZero(feeAssetUserCurrencyRate?.price))
    .toFixed()

  const approvalNetworkFeeCryptoPrecision = fromBaseUnit(
    approvalNetworkFeeCryptoBaseUnit,
    sellChainFeeAsset?.precision ?? 0,
  )

  const approvalNetworkFeeUserCurrency = bnOrZero(approvalNetworkFeeCryptoPrecision)
    .times(bnOrZero(feeAssetUserCurrencyRate?.price))
    .toFixed()

  const tradeResetStepSummary = useMemo(() => {
    return (
      <Stack spacing={4} px={6} width='full'>
        <Row>
          <Row.Label>
            <Text translation='common.allowanceResetFee' />
          </Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isAllowanceResetLoading}>
              <HStack justifyContent='flex-end'>
                <Amount.Crypto
                  symbol={sellChainFeeAsset?.symbol ?? ''}
                  value={allowanceResetNetworkFeeCryptoPrecision}
                />
                <Amount.Fiat
                  color={'text.subtle'}
                  prefix='('
                  suffix=')'
                  noSpace
                  value={allowanceResetNetworkFeeUserCurrency}
                />
              </HStack>
            </Skeleton>
          </Row.Value>
        </Row>
      </Stack>
    )
  }, [
    allowanceResetNetworkFeeCryptoPrecision,
    allowanceResetNetworkFeeUserCurrency,
    isAllowanceResetLoading,
    sellChainFeeAsset?.symbol,
  ])

  const isPermit2 = useMemo(() => {
    return isPermit2Hop(tradeQuoteStep)
  }, [tradeQuoteStep])

  const tradeAllowanceStepSummary = useMemo(() => {
    return (
      <Stack spacing={4} px={6} width='full'>
        <Row>
          <Row.Label>
            <Text translation='common.approvalFee' />
          </Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isAllowanceApprovalLoading}>
              <HStack justifyContent='flex-end'>
                <Amount.Crypto
                  symbol={sellChainFeeAsset?.symbol ?? ''}
                  value={approvalNetworkFeeCryptoPrecision}
                />
                <Amount.Fiat
                  color={'text.subtle'}
                  prefix='('
                  suffix=')'
                  noSpace
                  value={approvalNetworkFeeUserCurrency}
                />
              </HStack>
            </Skeleton>
          </Row.Value>
        </Row>
        {/* Permit2 should always have unlimited allowance without ability to toggle */}
        {!isPermit2 && (
          <Row>
            <Row.Value textAlign='right' display='flex' alignItems='center'>
              <Text
                color={isExactAllowance ? 'text.subtle' : 'white'}
                translation='trade.unlimited'
                fontWeight='bold'
              />
              <Switch
                size='sm'
                mx={2}
                isChecked={isExactAllowance}
                disabled={isAllowanceApprovalLoading}
                onChange={toggleIsExactAllowance}
              />
              <Text
                color={isExactAllowance ? 'white' : 'text.subtle'}
                translation='trade.exact'
                fontWeight='bold'
              />
            </Row.Value>
          </Row>
        )}
      </Stack>
    )
  }, [
    isAllowanceApprovalLoading,
    sellChainFeeAsset?.symbol,
    approvalNetworkFeeCryptoPrecision,
    approvalNetworkFeeUserCurrency,
    isPermit2,
    isExactAllowance,
    toggleIsExactAllowance,
  ])

  const tradeExecutionStepSummary = useMemo(() => {
    return (
      <Stack spacing={4} px={6} width='full'>
        <ReceiveAddressRow
          explorerAddressLink={buyAsset.explorerAddressLink}
          receiveAddress={receiveAddress ?? ''}
        />
        <Row>
          <Row.Label>
            <Text translation='trade.transactionFee' />
          </Row.Label>
          <Row.Value>
            <Skeleton
              isLoaded={
                !isActiveSwapperQuoteLoading &&
                !isNetworkFeeCryptoBaseUnitLoading &&
                !isNetworkFeeCryptoBaseUnitRefetching
              }
            >
              <HStack justifyContent='flex-end'>
                <Amount.Crypto symbol={feeAsset?.symbol ?? ''} value={networkFeeCryptoPrecision} />
                <Amount.Fiat
                  color={'text.subtle'}
                  prefix='('
                  suffix=')'
                  noSpace
                  value={networkFeeUserCurrency}
                />
              </HStack>
            </Skeleton>
          </Row.Value>
        </Row>
        {maybeDepositAddress && (
          <DepositAddressRow
            explorerAddressLink={sellAsset?.explorerAddressLink ?? ''}
            depositAddress={maybeDepositAddress}
          />
        )}
        {maybeUtxoChangeAddress && (
          <Row>
            <Row.Label>
              <HelperTooltip label={translate('trade.changeAddressExplainer')}>
                <HStack spacing={2}>
                  <Icon as={TbArrowsSplit2} />
                  <Text translation='trade.changeAddress' />
                </HStack>
              </HelperTooltip>
            </Row.Label>
            <Row.Value>
              <HStack>
                <TooltipWithTouch label={maybeUtxoChangeAddress}>
                  <RawText>{middleEllipsis(maybeUtxoChangeAddress)}</RawText>
                </TooltipWithTouch>
                <Link
                  href={`${sellAsset?.explorerAddressLink}${maybeUtxoChangeAddress}`}
                  isExternal
                  aria-label={translate('common.viewOnExplorer')}
                >
                  <Icon as={ExternalLinkIcon} />
                </Link>
              </HStack>
            </Row.Value>
          </Row>
        )}
      </Stack>
    )
  }, [
    isActiveSwapperQuoteLoading,
    isNetworkFeeCryptoBaseUnitLoading,
    isNetworkFeeCryptoBaseUnitRefetching,
    feeAsset?.symbol,
    networkFeeCryptoPrecision,
    networkFeeUserCurrency,
    buyAsset.explorerAddressLink,
    receiveAddress,
    maybeUtxoChangeAddress,
    translate,
    sellAsset?.explorerAddressLink,
    maybeDepositAddress,
  ])

  const tradeDetail = useMemo(() => {
    switch (currentTradeStep) {
      // No trade step is active, quote is still to be confirmed
      case undefined:
        return <TradeConfirmSummary />
      case StepperStep.FirstHopReset:
      case StepperStep.LastHopReset:
        return tradeResetStepSummary
      case StepperStep.FirstHopApproval:
      case StepperStep.LastHopApproval:
        return tradeAllowanceStepSummary
      case StepperStep.FirstHopSwap:
      case StepperStep.LastHopSwap:
        return tradeExecutionStepSummary
      default:
        return null
    }
  }, [
    currentTradeStep,
    tradeResetStepSummary,
    tradeAllowanceStepSummary,
    tradeExecutionStepSummary,
  ])

  const sharedConfirmFooterPaddingTop = useMemo(() => {
    if (!currentTradeStep) {
      return 0
    }

    return 4
  }, [currentTradeStep])

  const footerButton = useMemo(() => {
    if (!tradeQuoteStep || currentHopIndex === undefined || !activeTradeId) return null
    return (
      <TradeFooterButton
        tradeQuoteStep={tradeQuoteStep}
        currentHopIndex={currentHopIndex}
        activeTradeId={activeTradeId}
        isExactAllowance={isExactAllowance}
        isLoading={isNetworkFeeCryptoBaseUnitLoading || isNetworkFeeCryptoBaseUnitRefetching}
      />
    )
  }, [
    tradeQuoteStep,
    currentHopIndex,
    activeTradeId,
    isExactAllowance,
    isNetworkFeeCryptoBaseUnitLoading,
    isNetworkFeeCryptoBaseUnitRefetching,
  ])

  return (
    <SharedConfirmFooter
      detail={tradeDetail}
      button={footerButton}
      pt={sharedConfirmFooterPaddingTop}
    />
  )
}
