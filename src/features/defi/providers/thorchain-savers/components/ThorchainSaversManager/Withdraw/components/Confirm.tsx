import { Alert, AlertIcon, Box, Skeleton, Stack, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { bchChainId, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
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
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import type { SendInput } from 'components/Modals/Send/Form'
import type { EstimateFeesInput } from 'components/Modals/Send/utils'
import { estimateFees, handleSend } from 'components/Modals/Send/utils'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { SwapperName } from 'lib/swapper/api'
import { getIsTradingActiveApi } from 'state/apis/swapper/getIsTradingActiveApi'
import {
  BASE_BPS_POINTS,
  fromThorBaseUnit,
  getThorchainSaversPosition,
  getThorchainSaversWithdrawQuote,
  getWithdrawBps,
  toThorBaseUnit,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectBIP44ParamsByAccountId,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectSelectedCurrency,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { ThorchainSaversWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [expiry, setExpiry] = useState<string>('')
  const [maybeFromUTXOAccountAddress, setMaybeFromUTXOAccountAddress] = useState<string>('')
  const [protocolFeeCryptoBaseUnit, setProtocolFeeCryptoBaseUnit] = useState<string>('')
  const [networkFeeCryptoBaseUnit, setNetworkFeeCryptoBaseUnit] = useState<string>('')
  const [dustAmountCryptoBaseUnit, setDustAmountCryptoBaseUnit] = useState<string>('')
  const [slippageCryptoAmountPrecision, setSlippageCryptoAmountPrecision] = useState<string | null>(
    null,
  )
  const { state, dispatch: contextDispatch } = useContext(WithdrawContext)
  const appDispatch = useAppDispatch()
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

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace, assetReference }),
    [assetNamespace, assetReference, chainId],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )

  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
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
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId ?? ''))

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))
  const userAddress: string | undefined = accountId && fromAccountId(accountId).account

  if (!asset) throw new Error(`Asset not found for AssetId ${opportunityData?.assetId}`)

  // user info
  const { state: walletState } = useWallet()

  const assetBalanceFilter = useMemo(
    () => ({ assetId: asset?.assetId, accountId: accountId ?? '' }),
    [accountId, asset?.assetId],
  )
  const assetBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, assetBalanceFilter),
  )

  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  // notify
  const toast = useToast()

  useEffect(() => {
    ;(async () => {
      try {
        if (!(accountId && opportunityData?.stakedAmountCryptoBaseUnit && asset)) return
        if (dustAmountCryptoBaseUnit && protocolFeeCryptoBaseUnit) return
        setQuoteLoading(true)

        const amountCryptoBaseUnit = bnOrZero(state?.withdraw.cryptoAmount).times(
          bn(10).pow(asset.precision),
        )

        if (amountCryptoBaseUnit.isZero()) return

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

        const quote = await getThorchainSaversWithdrawQuote({ asset, accountId, bps: withdrawBps })

        const { expiry, dust_amount, expected_amount_out, slippage_bps } = quote

        setExpiry(expiry)

        setProtocolFeeCryptoBaseUnit(
          toBaseUnit(
            fromThorBaseUnit(amountCryptoThorBaseUnit.minus(expected_amount_out)),
            asset.precision,
          ),
        )
        setDustAmountCryptoBaseUnit(
          bnOrZero(toBaseUnit(fromThorBaseUnit(dust_amount), asset.precision)).toFixed(
            asset.precision,
          ),
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
    opportunity?.apy,
    opportunityData?.rewardsCryptoBaseUnit,
    opportunityData?.stakedAmountCryptoBaseUnit,
    state?.withdraw.cryptoAmount,
    protocolFeeCryptoBaseUnit,
  ])

  useEffect(() => {
    ;(async () => {
      if (maybeFromUTXOAccountAddress || !isUtxoChainId(chainId) || !accountId) return

      try {
        const position = await getThorchainSaversPosition({ accountId, assetId })
        if (!position) return ''
        const { asset_address } = position
        const accountAddress =
          chainId === bchChainId ? `bitcoincash:${asset_address}` : asset_address

        setMaybeFromUTXOAccountAddress(accountAddress)
      } catch (_e) {
        throw new Error(`Cannot get savers position for accountId: ${accountId}`)
      }
    })()
  }, [accountId, assetId, chainId, maybeFromUTXOAccountAddress])

  const getEstimateFeesArgs: () => Promise<EstimateFeesInput> = useCallback(async () => {
    if (!(accountId && opportunityData?.stakedAmountCryptoBaseUnit?.[0]))
      throw new Error('accountId is undefined')

    const amountCryptoBaseUnit = bnOrZero(state?.withdraw.cryptoAmount).times(
      bn(10).pow(asset.precision),
    )

    const withdrawBps = getWithdrawBps({
      withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
      stakedAmountCryptoBaseUnit: opportunityData?.stakedAmountCryptoBaseUnit,
      rewardsAmountCryptoBaseUnit: opportunityData?.rewardsCryptoBaseUnit?.amounts[0] ?? '0',
    })
    const quote = await getThorchainSaversWithdrawQuote({ asset, accountId, bps: withdrawBps })

    if (isUtxoChainId(chainId) && !maybeFromUTXOAccountAddress) {
      throw new Error('Account address required to withdraw from THORChain savers')
    }

    const { expiry, expected_amount_out, dust_amount } = quote

    const amountCryptoThorBaseUnit = toThorBaseUnit({
      valueCryptoBaseUnit: amountCryptoBaseUnit,
      asset,
    })
    setExpiry(expiry)
    setProtocolFeeCryptoBaseUnit(
      toBaseUnit(
        fromThorBaseUnit(amountCryptoThorBaseUnit.minus(expected_amount_out)),
        asset.precision,
      ),
    )

    if (!quote) throw new Error('Cannot get THORCHain savers withdraw quote')

    return {
      from: maybeFromUTXOAccountAddress,
      cryptoAmount: fromThorBaseUnit(dust_amount).toFixed(asset.precision),
      assetId,
      to: quote.inbound_address,
      sendMax: false,
      accountId,
      contractAddress: '',
    }
  }, [
    accountId,
    asset,
    assetId,
    chainId,
    maybeFromUTXOAccountAddress,
    opportunityData?.rewardsCryptoBaseUnit?.amounts,
    opportunityData?.stakedAmountCryptoBaseUnit,
    state?.withdraw.cryptoAmount,
  ])

  useEffect(() => {
    ;(async () => {
      if (!contextDispatch) return
      const estimatedFees = await estimateFees(await getEstimateFeesArgs())
      setNetworkFeeCryptoBaseUnit(estimatedFees.fast.txFee)

      contextDispatch({
        type: ThorchainSaversWithdrawActionType.SET_WITHDRAW,
        payload: {
          networkFeeCryptoBaseUnit: estimatedFees.fast.txFee,
        },
      })
    })()
  }, [contextDispatch, getEstimateFeesArgs])

  const getPreWithdrawInput: () => Promise<SendInput | undefined> = useCallback(async () => {
    if (
      !(
        accountId &&
        assetId &&
        state?.withdraw?.estimatedGasCrypto &&
        opportunityData?.stakedAmountCryptoBaseUnit &&
        contextDispatch
      )
    )
      return

    try {
      const estimatedFees = await estimateFees(await getEstimateFeesArgs())

      contextDispatch({
        type: ThorchainSaversWithdrawActionType.SET_WITHDRAW,
        payload: {
          networkFeeCryptoBaseUnit: estimatedFees.fast.txFee,
        },
      })

      const amountCryptoBaseUnit = bnOrZero(state?.withdraw.cryptoAmount).times(
        bn(10).pow(asset.precision),
      )

      const bps = getWithdrawBps({
        withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
        stakedAmountCryptoBaseUnit: opportunityData?.stakedAmountCryptoBaseUnit,
        rewardsAmountCryptoBaseUnit: opportunityData?.rewardsCryptoBaseUnit?.amounts[0] ?? '0',
      })

      const quote = await getThorchainSaversWithdrawQuote({ asset, accountId, bps })

      if (isUtxoChainId(chainId) && !maybeFromUTXOAccountAddress) {
        throw new Error('Account address required to withdraw from THORChain savers')
      }

      const sendInput: SendInput = {
        cryptoAmount: '',
        assetId,
        from: '', // Let coinselect do its magic here
        to: maybeFromUTXOAccountAddress,
        sendMax: true,
        accountId,
        amountFieldError: '',
        estimatedFees,
        feeType: FeeDataKey.Fast,
        fiatAmount: '',
        fiatSymbol: selectedCurrency,
        vanityAddress: '',
        input: quote.inbound_address,
      }

      return sendInput
    } catch (e) {
      console.error(e)
    }
  }, [
    accountId,
    assetId,
    state?.withdraw?.estimatedGasCrypto,
    state?.withdraw.cryptoAmount,
    opportunityData?.stakedAmountCryptoBaseUnit,
    opportunityData?.rewardsCryptoBaseUnit?.amounts,
    contextDispatch,
    getEstimateFeesArgs,
    asset,
    chainId,
    maybeFromUTXOAccountAddress,
    selectedCurrency,
  ])

  const getWithdrawInput: () => Promise<SendInput | undefined> = useCallback(async () => {
    if (!(accountId && assetId && opportunityData?.stakedAmountCryptoBaseUnit && contextDispatch))
      return

    try {
      const estimatedFees = await estimateFees(await getEstimateFeesArgs())

      contextDispatch({
        type: ThorchainSaversWithdrawActionType.SET_WITHDRAW,
        payload: {
          networkFeeCryptoBaseUnit: estimatedFees.fast.txFee,
        },
      })

      const amountCryptoBaseUnit = bnOrZero(state?.withdraw.cryptoAmount).times(
        bn(10).pow(asset.precision),
      )

      const withdrawBps = getWithdrawBps({
        withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
        stakedAmountCryptoBaseUnit: opportunityData?.stakedAmountCryptoBaseUnit,
        rewardsAmountCryptoBaseUnit: opportunityData?.rewardsCryptoBaseUnit?.amounts[0] ?? '0',
      })

      if (bn(withdrawBps).isZero()) return

      const quote = await getThorchainSaversWithdrawQuote({ asset, accountId, bps: withdrawBps })

      if (!quote) throw new Error('Error getting THORChain savers withdraw quote')

      const { dust_amount } = quote

      if (isUtxoChainId(chainId) && !maybeFromUTXOAccountAddress) {
        throw new Error('Account address required to withdraw from THORChain savers')
      }

      const sendInput: SendInput = {
        cryptoAmount: fromThorBaseUnit(dust_amount).toFixed(asset.precision),
        assetId,
        to: quote.inbound_address,
        from: maybeFromUTXOAccountAddress,
        sendMax: false,
        accountId,
        amountFieldError: '',
        estimatedFees,
        feeType: FeeDataKey.Fast,
        fiatAmount: '',
        fiatSymbol: selectedCurrency,
        vanityAddress: '',
        input: quote.inbound_address,
      }

      return sendInput
    } catch (e) {
      console.error(e)
    }
  }, [
    accountId,
    assetId,
    opportunityData?.stakedAmountCryptoBaseUnit,
    opportunityData?.rewardsCryptoBaseUnit?.amounts,
    getEstimateFeesArgs,
    contextDispatch,
    state?.withdraw.cryptoAmount,
    asset,
    chainId,
    maybeFromUTXOAccountAddress,
    selectedCurrency,
  ])

  const handleMultiTxSend = useCallback(async (): Promise<string | undefined> => {
    if (!walletState.wallet) return

    // THORChain Txs need to always be sent from the same address, since the address (NOT the pubkey) is used to identify an active position
    // The way THORChain does this is by not being xpub-compliant, and only exposing a single address for UTXOs in their UI
    // All deposit/withdraws done from their UI are always done with one/many UTXOs from the same address, and change sent back to the same address
    // We also do this EXCLUSIVELY for THORChain Txs. The rest of the app uses xpubs, so the initially deposited from address isn't guaranteed to be populated
    // if users send other UTXO Txs in the meantime after depositing
    // Additionally, we select their highest balance UTXO address as a first deposit, which isn't guaranteed to contain enough value
    //
    // For both re/deposit flows, we will possibly need a pre-Tx to populate their highest UTXO/previously deposited from address with enough value

    const withdrawInput = await getWithdrawInput()
    if (!withdrawInput) throw new Error('Error building send input')

    // Try/catching and evaluating to something in the catch isn't a good pattern usually
    // In our case, handleSend() catching means that after all our previous checks, building a Tx failed at coinselect time
    // So we actually send reconciliate a reconciliate Tx, retry the original send within the same block
    // and finally evaluate to either the original Tx or a falsy empty string
    // 1. Try to deposit from the originally deposited from / highest UTXO balance address
    // If this is enough, no other Tx is needed
    const txId = await handleSend({
      sendInput: withdrawInput,
      wallet: walletState.wallet,
    }).catch(async e => {
      if (!isUtxoChainId(chainId)) throw e

      // 2. coinselect threw when building a Tx, meaning there's not enough value in the picked address - send funds to it
      const preWithdrawInput = await getPreWithdrawInput()
      if (!preWithdrawInput) throw new Error('Error building send input')

      return handleSend({
        sendInput: preWithdrawInput,
        wallet: walletState.wallet!,
      }).then(async () => {
        // Safety factor for the Tx to be seen in the mempool
        await new Promise(resolve => setTimeout(resolve, 5000))
        // 3. Sign and broadcast the depooosit Tx again
        return handleSend({
          sendInput: withdrawInput,
          wallet: walletState.wallet!,
        })
      })
    })

    return txId
  }, [chainId, getPreWithdrawInput, getWithdrawInput, walletState.wallet])

  const handleConfirm = useCallback(async () => {
    if (!contextDispatch || !bip44Params || !accountId || !assetId || !opportunityData) return
    try {
      if (
        !(
          userAddress &&
          assetReference &&
          walletState.wallet &&
          supportsETH(walletState.wallet) &&
          opportunity &&
          chainAdapter
        )
      )
        return

      if (isUtxoChainId(chainId) && !maybeFromUTXOAccountAddress) return

      contextDispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: true })
      if (!state?.withdraw.cryptoAmount) return

      if (dayjs().isAfter(dayjs.unix(Number(expiry)))) {
        toast({
          position: 'top-right',
          description: translate('trade.errors.quoteExpired'),
          title: translate('common.transactionFailed'),
          status: 'error',
        })
        onNext(DefiStep.Info)
        return
      }

      const { getIsTradingActive } = getIsTradingActiveApi.endpoints
      const { data: isTradingActive } = await appDispatch(
        getIsTradingActive.initiate({
          assetId,
          swapperName: SwapperName.Thorchain,
        }),
      )

      if (!isTradingActive) {
        throw new Error(`THORChain pool halted for assetId: ${assetId}`)
      }

      const withdrawInput = await getWithdrawInput()
      if (!withdrawInput) throw new Error('Error building send input')

      const maybeTxId = await handleMultiTxSend()
      if (!maybeTxId) {
        throw new Error('Error sending THORCHain savers Txs')
      }

      contextDispatch({ type: ThorchainSaversWithdrawActionType.SET_TXID, payload: maybeTxId })
      contextDispatch({
        type: ThorchainSaversWithdrawActionType.SET_WITHDRAW,
        payload: {
          dustAmountCryptoBaseUnit,
          protocolFeeCryptoBaseUnit,
          maybeFromUTXOAccountAddress,
        },
      })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvents.WithdrawConfirm,
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
    assets,
    contextDispatch,
    bip44Params,
    accountId,
    assetId,
    opportunityData,
    userAddress,
    assetReference,
    walletState.wallet,
    opportunity,
    chainAdapter,
    chainId,
    maybeFromUTXOAccountAddress,
    state?.withdraw.cryptoAmount,
    state?.withdraw.fiatAmount,
    expiry,
    appDispatch,
    getWithdrawInput,
    handleMultiTxSend,
    dustAmountCryptoBaseUnit,
    protocolFeeCryptoBaseUnit,
    onNext,
    toast,
    translate,
  ])

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const missingBalanceForGas = useMemo(
    () =>
      bnOrZero(assetBalance)
        .minus(bnOrZero(state?.withdraw.estimatedGasCrypto).div(bn(10).pow(asset.precision)))
        .minus(bnOrZero(dustAmountCryptoBaseUnit).div(bn(10).pow(asset.precision)))
        .times(-1),
    [assetBalance, state?.withdraw.estimatedGasCrypto, asset.precision, dustAmountCryptoBaseUnit],
  )

  const hasEnoughBalanceForGas = useMemo(() => missingBalanceForGas.lte(0), [missingBalanceForGas])

  useEffect(() => {
    if (!hasEnoughBalanceForGas) {
      mixpanel?.track(MixPanelEvents.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  if (!state || !contextDispatch) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      headerText='modals.confirm.withdraw.header'
      isDisabled={!hasEnoughBalanceForGas}
      loading={quoteLoading || state.loading}
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
        <Row variant='gutter'>
          <Row.Label>{translate('common.slippage')}</Row.Label>
          <Row.Value>
            <Amount.Crypto value={slippageCryptoAmountPrecision ?? ''} symbol={asset.symbol} />
          </Row.Value>
        </Row>
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
                  value={bnOrZero(networkFeeCryptoBaseUnit)
                    .div(bn(10).pow(asset.precision))
                    .times(marketData.price)
                    .toFixed()}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={bnOrZero(networkFeeCryptoBaseUnit)
                    .div(bn(10).pow(asset.precision))
                    .toFixed()}
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
                  value={bnOrZero(protocolFeeCryptoBaseUnit)
                    .div(bn(10).pow(asset.precision))
                    .times(marketData.price)
                    .toFixed()}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={bnOrZero(protocolFeeCryptoBaseUnit)
                    .div(bn(10).pow(asset.precision))
                    .toFixed()}
                  symbol={asset.symbol}
                />
              </Skeleton>
            </Box>
          </Row.Value>
        </Row>
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
                  value={bnOrZero(dustAmountCryptoBaseUnit)
                    .div(bn(10).pow(asset.precision))
                    .times(marketData.price)
                    .toFixed(2)}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={bnOrZero(dustAmountCryptoBaseUnit)
                    .div(bn(10).pow(asset.precision))
                    .toFixed()}
                  symbol={asset.symbol}
                />
              </Skeleton>
            </Box>
          </Row.Value>
        </Row>
        {!hasEnoughBalanceForGas && (
          <Alert status='error' borderRadius='lg'>
            <AlertIcon />
            <Text
              translation={[
                'modals.confirm.missingFundsForGas',
                {
                  cryptoAmountHuman: missingBalanceForGas.toFixed(6, BigNumber.ROUND_UP),
                  assetSymbol: asset.symbol,
                },
              ]}
            />
          </Alert>
        )}
      </Summary>
    </ReusableConfirm>
  )
}
