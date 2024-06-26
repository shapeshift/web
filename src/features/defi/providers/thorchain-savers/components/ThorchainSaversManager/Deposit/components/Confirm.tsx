import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Flex,
  Skeleton,
  Stack,
  useToast,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { fromThorBaseUnit, toThorBaseUnit } from 'lib/utils/thorchain'
import { BASE_BPS_POINTS } from 'lib/utils/thorchain/constants'
import { useGetThorchainSaversDepositQuoteQuery } from 'lib/utils/thorchain/hooks/useGetThorchainSaversDepositQuoteQuery'
import { useSendThorTx } from 'lib/utils/thorchain/hooks/useSendThorTx'
import type { ThorchainSaversDepositQuoteResponseSuccess } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/types'
import {
  getThorchainSaversPosition,
  makeDaysToBreakEven,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAssetById,
  selectAssets,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountMetadataByAccountId,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ThorchainSaversDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const { state, dispatch: contextDispatch } = useContext(DepositContext)
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  // TODO: Allow user to set fee priority
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const opportunity = useMemo(() => state?.opportunity, [state])
  const assets = useAppSelector(selectAssets)

  const chainAdapter = getChainAdapterManager().get(chainId)!

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${assetId}`)

  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId ?? ''),
  )
  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountFilter),
  )
  const bip44Params = accountMetadata?.bip44Params
  // user info
  const {
    state: { wallet },
  } = useWallet()

  // notify
  const toast = useToast()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId }),
    [accountId, feeAsset?.assetId],
  )

  const feeAssetBalanceCryptoBaseUnit = useAppSelector(s =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(s, feeAssetBalanceFilter),
  )

  const amountCryptoBaseUnit = useMemo(
    () => bn(toBaseUnit(state?.deposit.cryptoAmount, asset.precision)),
    [asset.precision, state?.deposit.cryptoAmount],
  )

  const selectQuoteData = useCallback(
    (quote: ThorchainSaversDepositQuoteResponseSuccess) => {
      const {
        fees: { slippage_bps },
        expected_amount_deposit: expectedAmountOutThorBaseUnit,
      } = quote
      const amountCryptoThorBaseUnit = toThorBaseUnit({
        valueCryptoBaseUnit: amountCryptoBaseUnit,
        asset,
      })

      // Total downside
      const protocolFeeCryptoBaseUnit = (() => {
        const thorchainFeeCryptoThorPrecision = fromThorBaseUnit(
          amountCryptoThorBaseUnit.minus(expectedAmountOutThorBaseUnit),
        )
        return toBaseUnit(thorchainFeeCryptoThorPrecision, asset.precision)
      })()

      const daysToBreakEven = opportunity
        ? makeDaysToBreakEven({
            amountCryptoBaseUnit,
            asset,
            apy: opportunity.apy,
            expectedAmountOutThorBaseUnit,
          })
        : undefined

      const slippageCryptoAmountPrecision = (() => {
        const slippagePercentage = bnOrZero(slippage_bps).div(BASE_BPS_POINTS).times(100)

        // slippage going into position - e.g. 0.007 ETH for 5 ETH deposit
        // This is NOT the same as the total THOR fees, which include the deposit fee in addition to the slippage
        const cryptoSlippageAmountPrecision = bnOrZero(state?.deposit.cryptoAmount)
          .times(slippagePercentage)
          .div(100)
        return cryptoSlippageAmountPrecision.toString()
      })()

      return { quote, slippageCryptoAmountPrecision, daysToBreakEven, protocolFeeCryptoBaseUnit }
    },
    [amountCryptoBaseUnit, asset, opportunity, state?.deposit.cryptoAmount],
  )

  const { data: quoteData, isLoading: isQuoteDataLoading } = useGetThorchainSaversDepositQuoteQuery(
    {
      asset,
      amountCryptoBaseUnit,
      select: selectQuoteData,
    },
  )

  const { data: fromAddress } = useQuery({
    ...reactQueries.common.thorchainFromAddress({
      accountId: accountId!,
      assetId,
      wallet: wallet!,
      accountMetadata: accountMetadata!,
      getPosition: getThorchainSaversPosition,
    }),
    enabled: Boolean(accountId && wallet && accountMetadata),
  })

  const { executeTransaction, isEstimatedFeesDataLoading, estimatedFeesData } = useSendThorTx({
    accountId: accountId ?? null,
    assetId,
    amountCryptoBaseUnit: toBaseUnit(state?.deposit.cryptoAmount, asset.precision),
    action: 'depositSavers',
    memo: quoteData?.quote.memo ?? null,
    fromAddress: fromAddress ?? null,
  })

  const estimatedGasCryptoPrecision = useMemo(() => {
    if (!estimatedFeesData) return
    return fromBaseUnit(estimatedFeesData.txFeeCryptoBaseUnit, feeAsset.precision)
  }, [estimatedFeesData, feeAsset.precision])

  useEffect(() => {
    if (!contextDispatch) return
    if (!estimatedFeesData) return
    if (!estimatedGasCryptoPrecision) return

    contextDispatch({
      type: ThorchainSaversDepositActionType.SET_DEPOSIT,
      payload: {
        estimatedGasCryptoPrecision,
        networkFeeCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
      },
    })
  }, [contextDispatch, estimatedFeesData, estimatedGasCryptoPrecision])

  const { isTradingActive, refetch: refetchIsTradingActive } = useIsTradingActive({
    assetId,
    swapperName: SwapperName.Thorchain,
  })

  const handleDeposit = useCallback(async () => {
    if (!contextDispatch || !bip44Params || !accountId || !assetId) return
    try {
      if (
        !(
          fromAddress &&
          assetReference &&
          wallet &&
          supportsETH(wallet) &&
          opportunity &&
          chainAdapter &&
          quoteData?.quote
        )
      )
        return

      if (!state?.deposit.cryptoAmount) {
        throw new Error('Cannot send 0-value THORCHain savers Tx')
      }

      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })

      // Was the pool active when it was fetched at the time of the component mount
      // If it wasn't, it's definitely not going to become active again in the few seconds it takes to go from mount to sign click
      if (isTradingActive === false) {
        throw new Error(`THORChain pool halted for assetId: ${assetId}`)
      }

      // Refetch the trading active state JIT to ensure the pool didn't just become halted
      const _isTradingActive = await refetchIsTradingActive()
      if (_isTradingActive === false) {
        throw new Error(`THORChain pool halted for assetId: ${assetId}`)
      }

      const _txId = await executeTransaction()
      if (!_txId) throw new Error('failed to broadcast transaction')

      contextDispatch({
        type: ThorchainSaversDepositActionType.SET_DEPOSIT,
        payload: {
          protocolFeeCryptoBaseUnit: quoteData?.protocolFeeCryptoBaseUnit,
          maybeFromUTXOAccountAddress: fromAddress,
        },
      })
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_TXID, payload: _txId })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvent.DepositConfirm,
        {
          opportunity,
          fiatAmounts: [state.deposit.fiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoHuman: state.deposit.cryptoAmount }],
        },
        assets,
      )
    } catch (error) {
      console.error(error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
    }
  }, [
    contextDispatch,
    bip44Params,
    accountId,
    assetId,
    fromAddress,
    assetReference,
    wallet,
    opportunity,
    chainAdapter,
    quoteData?.quote,
    quoteData?.protocolFeeCryptoBaseUnit,
    state?.deposit.cryptoAmount,
    state?.deposit.fiatAmount,
    isTradingActive,
    refetchIsTradingActive,
    executeTransaction,
    onNext,
    assets,
    toast,
    translate,
  ])

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(feeAssetBalanceCryptoBaseUnit)
        .minus(
          toBaseUnit(state?.deposit.estimatedGasCryptoPrecision ?? 0, feeAsset?.precision ?? 0),
        )
        .gte(0),
    [feeAssetBalanceCryptoBaseUnit, state?.deposit.estimatedGasCryptoPrecision, feeAsset],
  )

  useEffect(() => {
    if (!hasEnoughBalanceForGas) {
      mixpanel?.track(MixPanelEvent.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  const notEnoughGasTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }],
    [feeAsset.symbol],
  )

  const { data: _isSmartContractAddress, isLoading: isAddressByteCodeLoading } =
    useIsSmartContractAddress(fromAddress ?? '')

  const disableSmartContractDeposit = useMemo(() => {
    // This is either a smart contract address, or the bytecode is still loading - disable confirm
    if (_isSmartContractAddress !== false) return true

    // All checks passed - this is an EOA address
    return false
  }, [_isSmartContractAddress])

  const preFooter = useMemo(() => {
    if (!_isSmartContractAddress) return null

    return (
      <Flex direction='column' gap={2}>
        <Alert status='error' width='auto' fontSize='sm'>
          <AlertIcon />
          <Stack spacing={0}>
            <AlertTitle>{translate('trade.errors.smartContractWalletNotSupported')}</AlertTitle>
            <AlertDescription lineHeight='short'>
              {translate('trade.thorSmartContractWalletUnsupported')}
            </AlertDescription>
          </Stack>
        </Alert>
      </Flex>
    )
  }, [_isSmartContractAddress, translate])

  if (!state || !contextDispatch) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      onConfirm={handleDeposit}
      preFooter={preFooter}
      isDisabled={
        !hasEnoughBalanceForGas ||
        !fromAddress ||
        disableSmartContractDeposit ||
        isTradingActive === false
      }
      loading={state.loading || !fromAddress || isAddressByteCodeLoading}
      loadingText={translate('common.confirm')}
      headerText='modals.confirm.deposit.header'
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToDeposit' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset.icon} />
              <RawText>{asset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.deposit.cryptoAmount} symbol={asset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='gutter'>
          <Row.Label>{translate('common.slippage')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isQuoteDataLoading}>
              <Amount.Crypto
                value={quoteData?.slippageCryptoAmountPrecision ?? ''}
                symbol={asset.symbol}
              />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <HelperTooltip label={translate('defi.modals.saversVaults.timeToBreakEven.tooltip')}>
              {translate('defi.modals.saversVaults.timeToBreakEven.title')}
            </HelperTooltip>
          </Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isQuoteDataLoading}>
              {translate(
                `defi.modals.saversVaults.${
                  bnOrZero(quoteData?.daysToBreakEven).eq(1) ? 'day' : 'days'
                }`,
                { amount: quoteData?.daysToBreakEven ?? '0' },
              )}
            </Skeleton>
          </Row.Value>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <HelperTooltip label={translate('trade.tooltip.protocolFee')}>
              <Text translation='trade.protocolFee' />
            </HelperTooltip>
          </Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isQuoteDataLoading}>
              <Box textAlign='right'>
                <Amount.Fiat
                  fontWeight='bold'
                  value={bn(
                    fromBaseUnit(quoteData?.protocolFeeCryptoBaseUnit ?? 0, asset.precision),
                  )
                    .times(marketData.price)
                    .toFixed()}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={fromBaseUnit(quoteData?.protocolFeeCryptoBaseUnit ?? 0, asset.precision)}
                  symbol={asset.symbol}
                />
              </Box>
            </Skeleton>
          </Row.Value>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <HelperTooltip label={translate('trade.tooltip.minerFee')}>
              <Text translation='trade.minerFee' />
            </HelperTooltip>
          </Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isEstimatedFeesDataLoading}>
              <Box textAlign='right'>
                <Amount.Fiat
                  fontWeight='bold'
                  value={bnOrZero(estimatedGasCryptoPrecision).times(feeMarketData.price).toFixed()}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={estimatedGasCryptoPrecision ?? '0'}
                  symbol={feeAsset.symbol}
                />
              </Box>
            </Skeleton>
          </Row.Value>
        </Row>
      </Summary>
      {!hasEnoughBalanceForGas && (
        <Alert status='error' borderRadius='lg'>
          <AlertIcon />
          <Text translation={notEnoughGasTranslation} />
        </Alert>
      )}
    </ReusableConfirm>
  )
}
