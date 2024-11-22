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
import { bchChainId, fromAccountId, thorchainAssetId, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { SwapperName } from '@shapeshiftoss/swapper'
import dayjs from 'dayjs'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
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
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { fromThorBaseUnit, toThorBaseUnit } from 'lib/utils/thorchain'
import { BASE_BPS_POINTS } from 'lib/utils/thorchain/constants'
import { useSendThorTx } from 'lib/utils/thorchain/hooks/useSendThorTx'
import type { ThorchainSaversWithdrawQuoteResponseSuccess } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/types'
import {
  getThorchainSaversPosition,
  getThorchainSaversWithdrawQuote,
  getWithdrawBps,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectBIP44ParamsByAccountId,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFeeAssetById,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ThorchainSaversWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quote, setQuote] = useState<ThorchainSaversWithdrawQuoteResponseSuccess | null>(null)
  const [expiry, setExpiry] = useState<string>('')
  const [fromAddress, setfromAddress] = useState<string | null>(null)
  const [protocolFeeCryptoBaseUnit, setProtocolFeeCryptoBaseUnit] = useState<string>('')
  const [dustAmountCryptoBaseUnit, setDustAmountCryptoBaseUnit] = useState<string>('')
  const [slippageCryptoAmountPrecision, setSlippageCryptoAmountPrecision] = useState<string | null>(
    null,
  )
  const { state, dispatch: contextDispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const opportunity = state?.opportunity
  const chainAdapter = getChainAdapterManager().get(chainId)
  const assets = useAppSelector(selectAssets)

  // Asset info
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const isRunePool = assetId === thorchainAssetId

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace, assetReference }),
    [assetNamespace, assetReference, chainId],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )

  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestStakingBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        (accountId ?? highestBalanceAccountId)!,
        toOpportunityId({
          chainId,
          assetNamespace,
          assetReference,
        }),
      ),
    }),
    [accountId, assetNamespace, assetReference, chainId, highestBalanceAccountId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId ?? ''),
  )
  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))
  const userAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : ''),
    [accountId],
  )

  if (!asset) throw new Error(`Asset not found for AssetId ${opportunityData?.assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${assetId}`)

  // user info
  const {
    state: { wallet },
  } = useWallet()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId }),
    [accountId, feeAsset?.assetId],
  )
  //
  const feeAssetBalanceCryptoBaseUnit = useAppSelector(s =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(s, feeAssetBalanceFilter),
  )

  // notify
  const toast = useToast()

  useEffect(() => {
    ;(async () => {
      try {
        if (isRunePool) return
        if (!(accountId && opportunityData?.stakedAmountCryptoBaseUnit && asset)) return
        // This effects sets these three state fields, so if we already have them, this is a no-op
        if (dustAmountCryptoBaseUnit && protocolFeeCryptoBaseUnit && expiry) return
        setQuoteLoading(true)

        const amountCryptoBaseUnit = toBaseUnit(state?.withdraw.cryptoAmount, asset.precision)
        if (bn(amountCryptoBaseUnit).isZero()) return

        const amountCryptoThorBaseUnit = toThorBaseUnit({
          valueCryptoBaseUnit: amountCryptoBaseUnit,
          asset,
        })

        const withdrawBps = getWithdrawBps({
          withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
          stakedAmountCryptoBaseUnit: opportunityData.stakedAmountCryptoBaseUnit,
          rewardsAmountCryptoBaseUnit: opportunityData?.rewardsCryptoBaseUnit?.amounts[0] ?? '0',
        })

        if (bn(withdrawBps).isZero()) return

        const maybeQuote = await getThorchainSaversWithdrawQuote({
          asset,
          accountId,
          bps: withdrawBps,
        })

        if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())
        const _quote = maybeQuote.unwrap()
        setQuote(_quote)

        const {
          expiry: _expiry,
          dust_amount,
          expected_amount_out,
          fees: { slippage_bps },
        } = _quote

        setExpiry(_expiry)

        const protocolFeeCryptoThorBaseUnit = amountCryptoThorBaseUnit.minus(expected_amount_out)
        setProtocolFeeCryptoBaseUnit(
          toBaseUnit(fromThorBaseUnit(protocolFeeCryptoThorBaseUnit), asset.precision),
        )
        setDustAmountCryptoBaseUnit(
          bnOrZero(toBaseUnit(fromThorBaseUnit(dust_amount), feeAsset.precision)).toFixed(),
        )
        const percentage = bnOrZero(slippage_bps).div(BASE_BPS_POINTS).times(100)
        // total downside (slippage going into position) - 0.007 ETH for 5 ETH deposit
        const cryptoSlippageAmountPrecision = bnOrZero(state?.withdraw.cryptoAmount)
          .times(percentage)
          .div(100)
        setSlippageCryptoAmountPrecision(cryptoSlippageAmountPrecision.toString())
      } catch (e) {
        console.error(e)
      } finally {
        setQuoteLoading(false)
      }
    })()
  }, [
    accountId,
    asset,
    dustAmountCryptoBaseUnit,
    feeAsset,
    opportunity?.apy,
    opportunityData?.rewardsCryptoBaseUnit,
    opportunityData?.stakedAmountCryptoBaseUnit,
    state?.withdraw.cryptoAmount,
    protocolFeeCryptoBaseUnit,
    expiry,
    isRunePool,
  ])

  useEffect(() => {
    ;(async () => {
      if (fromAddress || !accountId) return

      try {
        const position = await getThorchainSaversPosition({ accountId, assetId })
        if (!position) return ''
        const { asset_address } = position
        const accountAddress =
          chainId === bchChainId ? `bitcoincash:${asset_address}` : asset_address

        setfromAddress(accountAddress)
      } catch (_e) {
        throw new Error(`Cannot get savers position for accountId: ${accountId}`)
      }
    })()
  }, [accountId, assetId, chainId, fromAddress])

  const memo = useMemo(() => {
    if (quote?.memo) return quote.memo

    if (isRunePool && state && opportunityData?.stakedAmountCryptoBaseUnit) {
      const amountCryptoBaseUnit = toBaseUnit(state?.withdraw.cryptoAmount, asset.precision)
      const withdrawBps = getWithdrawBps({
        withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
        stakedAmountCryptoBaseUnit: opportunityData.stakedAmountCryptoBaseUnit,
        rewardsAmountCryptoBaseUnit: opportunityData?.rewardsCryptoBaseUnit?.amounts[0] ?? '0',
      })

      return `pool-:${withdrawBps}`
    }

    return null
  }, [isRunePool, quote, state, opportunityData, asset.precision])

  const { executeTransaction, estimatedFeesData } = useSendThorTx({
    accountId: accountId ?? null,
    assetId,
    // withdraw savers will use dust amount
    amountCryptoBaseUnit: null,
    action: isRunePool ? 'withdrawRunepool' : 'withdrawSavers',
    memo,
    fromAddress,
    dustAmountCryptoBaseUnit,
  })

  const estimatedGasCryptoPrecision = useMemo(() => {
    if (!estimatedFeesData) return
    return fromBaseUnit(estimatedFeesData.txFeeCryptoBaseUnit, feeAsset.precision)
  }, [estimatedFeesData, feeAsset.precision])

  useEffect(() => {
    if (!estimatedFeesData || !contextDispatch) return

    contextDispatch({
      type: ThorchainSaversWithdrawActionType.SET_WITHDRAW,
      payload: {
        estimatedGasCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
        networkFeeCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
      },
    })
  }, [contextDispatch, estimatedFeesData])

  const { isTradingActive, refetch: refetchIsTradingActive } = useIsTradingActive({
    assetId,
    swapperName: SwapperName.Thorchain,
  })

  const handleConfirm = useCallback(async () => {
    if (!isRunePool && !expiry) return
    if (!contextDispatch || !bip44Params || !accountId || !assetId || !opportunityData) return
    try {
      if (
        !(
          userAddress &&
          assetReference &&
          wallet &&
          supportsETH(wallet) &&
          opportunity &&
          chainAdapter
        )
      )
        return

      contextDispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: true })
      if (!state?.withdraw.cryptoAmount) return

      if (!isRunePool && dayjs().isAfter(dayjs.unix(Number(expiry)))) {
        toast({
          position: 'top-right',
          description: translate('trade.errors.quoteExpired'),
          title: translate('common.transactionFailed'),
          status: 'error',
        })
        onNext(DefiStep.Info)
        return
      }

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
      if (!_txId) throw new Error('No txId returned from onSignTx')

      contextDispatch({ type: ThorchainSaversWithdrawActionType.SET_TXID, payload: _txId })
      contextDispatch({
        type: ThorchainSaversWithdrawActionType.SET_WITHDRAW,
        payload: {
          dustAmountCryptoBaseUnit,
          protocolFeeCryptoBaseUnit,
          maybeFromUTXOAccountAddress: fromAddress ?? '',
        },
      })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvent.WithdrawConfirm,
        {
          opportunity: opportunityData,
          fiatAmounts: [state.withdraw.fiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoHuman: state.withdraw.cryptoAmount }],
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
      contextDispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: false })
    }
  }, [
    contextDispatch,
    bip44Params,
    accountId,
    assetId,
    opportunityData,
    expiry,
    userAddress,
    assetReference,
    wallet,
    opportunity,
    chainAdapter,
    fromAddress,
    state?.withdraw.cryptoAmount,
    state?.withdraw.fiatAmount,
    isTradingActive,
    refetchIsTradingActive,
    executeTransaction,
    dustAmountCryptoBaseUnit,
    protocolFeeCryptoBaseUnit,
    onNext,
    assets,
    toast,
    translate,
    isRunePool,
  ])

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const missingBalanceForGasCryptoPrecision = useMemo(() => {
    return fromBaseUnit(
      bnOrZero(feeAssetBalanceCryptoBaseUnit)
        .minus(bnOrZero(state?.withdraw.estimatedGasCryptoBaseUnit))
        .minus(bnOrZero(dustAmountCryptoBaseUnit))
        .times(-1),
      feeAsset.precision,
    )
  }, [
    state?.withdraw.estimatedGasCryptoBaseUnit,
    dustAmountCryptoBaseUnit,
    feeAssetBalanceCryptoBaseUnit,
    feeAsset.precision,
  ])

  const hasEnoughBalanceForGas = useMemo(
    () => bn(missingBalanceForGasCryptoPrecision).lte(0),
    [missingBalanceForGasCryptoPrecision],
  )

  useEffect(() => {
    if (!hasEnoughBalanceForGas) {
      mixpanel?.track(MixPanelEvent.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  const missingFundsForGasTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      'modals.confirm.missingFundsForGas',
      {
        cryptoAmountHuman: bn(missingBalanceForGasCryptoPrecision).toFixed(6, BigNumber.ROUND_UP),
        assetSymbol: feeAsset.symbol,
      },
    ],
    [missingBalanceForGasCryptoPrecision, feeAsset.symbol],
  )

  const { data: _isSmartContractAddress, isLoading: isAddressByteCodeLoading } =
    useIsSmartContractAddress(userAddress, chainId)

  const disableSmartContractWithdraw = useMemo(() => {
    // This is either a smart contract address, or the bytecode is still loading - disable confirm
    if (_isSmartContractAddress) return true

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

  const canWithdraw = useMemo(() => {
    const amountCryptoBaseUnit = toBaseUnit(state?.withdraw.cryptoAmount, asset.precision)

    // @TODO: RUNEPool withdraws are not going through for now because of the 90 days lock, we don't know yet if there are any protocol fees
    // we might want to adjust it later if we confirm that it involve some protocol fees
    return bnOrZero(amountCryptoBaseUnit).gte(isRunePool ? 0 : protocolFeeCryptoBaseUnit)
  }, [state?.withdraw.cryptoAmount, asset.precision, protocolFeeCryptoBaseUnit, isRunePool])

  if (!state || !contextDispatch) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      preFooter={preFooter}
      headerText='modals.confirm.withdraw.header'
      isDisabled={
        (!expiry && !isRunePool) ||
        !hasEnoughBalanceForGas ||
        !userAddress ||
        disableSmartContractWithdraw ||
        !canWithdraw ||
        isTradingActive === false
      }
      loading={quoteLoading || state.loading || !userAddress || isAddressByteCodeLoading}
      loadingText={translate('common.confirm')}
      onConfirm={handleConfirm}
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset.icon} />
              <RawText>{asset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.cryptoAmount} symbol={asset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        {!isRunePool ? (
          <Row variant='gutter'>
            <Row.Label>{translate('common.slippage')}</Row.Label>
            <Row.Value>
              <Amount.Crypto value={slippageCryptoAmountPrecision ?? ''} symbol={asset.symbol} />
            </Row.Value>
          </Row>
        ) : null}
        <Row variant='gutter'>
          <Row.Label>
            <HelperTooltip label={translate('trade.tooltip.protocolFee')}>
              <Text translation='trade.protocolFee' />
            </HelperTooltip>
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Skeleton isLoaded={!quoteLoading}>
                <Amount.Fiat
                  fontWeight='bold'
                  value={bn(fromBaseUnit(protocolFeeCryptoBaseUnit, asset.precision))
                    .times(marketData.price)
                    .toFixed()}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={fromBaseUnit(protocolFeeCryptoBaseUnit, asset.precision)}
                  symbol={asset.symbol}
                />
              </Skeleton>
            </Box>
          </Row.Value>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <HelperTooltip label={translate('trade.tooltip.minerFee')}>
              <Text translation='trade.minerFee' />
            </HelperTooltip>
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Skeleton isLoaded={!quoteLoading}>
                <Amount.Fiat
                  fontWeight='bold'
                  value={bnOrZero(estimatedGasCryptoPrecision).times(feeMarketData.price).toFixed()}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={estimatedGasCryptoPrecision ?? '0'}
                  symbol={feeAsset.symbol}
                />
              </Skeleton>
            </Box>
          </Row.Value>
        </Row>
        {!isRunePool && (
          <Row variant='gutter'>
            <Row.Label>
              <HelperTooltip label={translate('defi.modals.saversVaults.dustAmountTooltip')}>
                <Text translation='defi.modals.saversVaults.dustAmount' />
              </HelperTooltip>
            </Row.Label>
            <Row.Value>
              <Box textAlign='right'>
                <Skeleton isLoaded={!quoteLoading}>
                  <Amount.Fiat
                    fontWeight='bold'
                    value={bn(fromBaseUnit(dustAmountCryptoBaseUnit, feeAsset.precision))
                      .times(feeMarketData.price)
                      .toFixed(2)}
                  />
                  <Amount.Crypto
                    color='text.subtle'
                    value={fromBaseUnit(dustAmountCryptoBaseUnit, feeAsset.precision)}
                    symbol={feeAsset.symbol}
                  />
                </Skeleton>
              </Box>
            </Row.Value>
          </Row>
        )}
        {!hasEnoughBalanceForGas && (
          <Alert status='error' borderRadius='lg'>
            <AlertIcon />
            <Text translation={missingFundsForGasTranslation} />
          </Alert>
        )}
      </Summary>
    </ReusableConfirm>
  )
}
