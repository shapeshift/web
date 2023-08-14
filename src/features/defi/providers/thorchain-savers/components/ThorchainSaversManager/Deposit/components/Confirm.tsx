import { Alert, AlertIcon, Box, Stack, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { bchChainId, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import type {
  FeeData,
  FeeDataEstimate,
  UtxoBaseAdapter,
  UtxoChainId,
} from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { utils } from 'ethers'
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
import { getSupportedEvmChainIds } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { SwapperName } from 'lib/swapper/api'
import { getIsTradingActiveApi } from 'state/apis/swapper/getIsTradingActiveApi'
import {
  BASE_BPS_POINTS,
  fromThorBaseUnit,
  getMaybeThorchainSaversDepositQuote,
  getThorchainSaversPosition,
  makeDaysToBreakEven,
  toThorBaseUnit,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectMarketDataById,
  selectPortfolioAccountMetadataByAccountId,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectSelectedCurrency,
} from 'state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import { ThorchainSaversDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

// Estimated miner fees are approximative since there might be a reconciliation Tx
// and an actual savers Tx with different fees, and we're doubling the fees
// This does NOT ensure dust will be kept for future Txs, but will ensure we are conservative WRT gas used
// so that the final outbound Tx can go through
const TXS_BUFFER = 10

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const [protocolFeeCryptoBaseUnit, setProtocolFeeCryptoBaseUnit] = useState<string>('')
  const [networkFeeCryptoBaseUnit, setNetworkFeeCryptoBaseUnit] = useState<string>('')
  const { state, dispatch: contextDispatch } = useContext(DepositContext)
  const [slippageCryptoAmountPrecision, setSlippageCryptoAmountPrecision] = useState<string | null>(
    null,
  )
  const [daysToBreakEven, setDaysToBreakEven] = useState<string | null>(null)
  const appDispatch = useAppDispatch()
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  // TODO: Allow user to set fee priority
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const opportunity = useMemo(() => state?.opportunity, [state])
  const assets = useAppSelector(selectAssets)

  // Technically any chain adapter, but is only used for UTXO ChainIds in this file, so effectively an UTXO adapter
  const chainAdapter = getChainAdapterManager().get(
    chainId,
  ) as unknown as UtxoBaseAdapter<UtxoChainId>

  const supportedEvmChainIds = useMemo(() => getSupportedEvmChainIds(), [])

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const [maybeFromUTXOAccountAddress, setMaybeFromUTXOAccountAddress] = useState<string>('')
  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, assetId ?? ''))

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountFilter),
  )
  const accountType = accountMetadata?.accountType
  const bip44Params = accountMetadata?.bip44Params
  const userAddress: string | undefined = accountId && fromAccountId(accountId).account

  // user info
  const { state: walletState } = useWallet()

  // notify
  const toast = useToast()

  const assetBalanceFilter = useMemo(
    () => ({ assetId: asset?.assetId, accountId }),
    [accountId, asset?.assetId],
  )

  const assetBalanceCryptoBaseUnit = useAppSelector(s =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(s, assetBalanceFilter),
  )

  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  useEffect(() => {
    ;(async () => {
      if (!opportunity?.apy) return
      if (!(accountId && state?.deposit.cryptoAmount && asset)) return
      if (protocolFeeCryptoBaseUnit) return

      const amountCryptoBaseUnit = bnOrZero(state?.deposit.cryptoAmount).times(
        bn(10).pow(asset.precision),
      )

      if (amountCryptoBaseUnit.isZero()) return

      const amountCryptoThorBaseUnit = toThorBaseUnit({
        valueCryptoBaseUnit: amountCryptoBaseUnit,
        asset,
      })

      const maybeQuote = await getMaybeThorchainSaversDepositQuote({ asset, amountCryptoBaseUnit })

      if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())

      const quote = maybeQuote.unwrap()

      const { expected_amount_out: expectedAmountOutThorBaseUnit, slippage_bps } = quote

      // Total downside
      const thorchainFeeCryptoPrecision = fromThorBaseUnit(
        amountCryptoThorBaseUnit.minus(expectedAmountOutThorBaseUnit),
      )

      setProtocolFeeCryptoBaseUnit(toBaseUnit(thorchainFeeCryptoPrecision, asset.precision))

      const slippagePercentage = bnOrZero(slippage_bps).div(BASE_BPS_POINTS).times(100)

      // slippage going into position - e.g. 0.007 ETH for 5 ETH deposit
      // This is NOT the same as the total THOR fees, which include the deposit fee in addition to the slippage
      const cryptoSlippageAmountPrecision = bnOrZero(state?.deposit.cryptoAmount)
        .times(slippagePercentage)
        .div(100)
      setSlippageCryptoAmountPrecision(cryptoSlippageAmountPrecision.toString())

      const daysToBreakEven = makeDaysToBreakEven({
        amountCryptoBaseUnit,
        asset,
        apy: opportunity.apy,
        expectedAmountOutThorBaseUnit,
      })
      setDaysToBreakEven(daysToBreakEven)
    })()
  }, [accountId, asset, protocolFeeCryptoBaseUnit, opportunity?.apy, state?.deposit.cryptoAmount])

  const getEstimateFeesArgs: () => Promise<EstimateFeesInput> = useCallback(async () => {
    if (!accountId) throw new Error('accountId required')
    if (isUtxoChainId(chainId) && !maybeFromUTXOAccountAddress) {
      throw new Error('UTXO from address required')
    }

    if (!state?.deposit.cryptoAmount) {
      throw new Error('Cannot send 0-value THORCHain savers Tx')
    }

    const amountCryptoBaseUnit = bnOrZero(state.deposit.cryptoAmount).times(
      bn(10).pow(asset.precision),
    )
    const maybeQuote = await getMaybeThorchainSaversDepositQuote({ asset, amountCryptoBaseUnit })
    if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())
    const quote = maybeQuote.unwrap()

    const amountCryptoThorBaseUnit = toThorBaseUnit({
      valueCryptoBaseUnit: amountCryptoBaseUnit,
      asset,
    })

    setProtocolFeeCryptoBaseUnit(
      toBaseUnit(
        fromThorBaseUnit(amountCryptoThorBaseUnit.minus(quote.expected_amount_out)),
        asset.precision,
      ),
    )

    const memoUtf8 = quote.memo
    return {
      cryptoAmount: state.deposit.cryptoAmount,
      assetId,
      from: maybeFromUTXOAccountAddress,
      to: quote.inbound_address,
      memo: supportedEvmChainIds.includes(chainId)
        ? utils.hexlify(utils.toUtf8Bytes(memoUtf8))
        : memoUtf8,
      sendMax: Boolean(!isUtxoChainId(chainId) && state?.deposit.sendMax),
      accountId,
      contractAddress: '',
    }
  }, [
    accountId,
    asset,
    assetId,
    chainId,
    maybeFromUTXOAccountAddress,
    state?.deposit.cryptoAmount,
    state?.deposit.sendMax,
    supportedEvmChainIds,
  ])

  const getSafeEstimatedFees = useCallback(async () => {
    return Object.fromEntries(
      Object.entries(await estimateFees(await getEstimateFeesArgs())).map(([feeType, feeData]) => [
        feeType as FeeDataKey,
        {
          ...feeData,
          txFee: bn(feeData.txFee).times(2).toString(),
          chainSpecific: {
            ...(feeData as FeeData<UtxoChainId>).chainSpecific,
            satoshiPerByte: bn((feeData as FeeData<UtxoChainId>).chainSpecific.satoshiPerByte)
              .times(2)
              .toString(),
          },
        },
      ]),
    ) as FeeDataEstimate<UtxoChainId> // We're lying to TS, this can be a FeeDataEstimate from any ChainId
  }, [getEstimateFeesArgs])

  useEffect(() => {
    ;(async () => {
      const estimatedFees = await getSafeEstimatedFees()
      setNetworkFeeCryptoBaseUnit(estimatedFees.fast.txFee)
    })()
  }, [getSafeEstimatedFees])

  const getDepositInput: () => Promise<SendInput | undefined> = useCallback(async () => {
    if (!contextDispatch) return
    if (!(accountId && assetId)) return
    if (!state?.deposit.cryptoAmount) {
      throw new Error('Cannot send 0-value THORCHain savers Tx')
    }

    try {
      // Estimated fees tend to produce too low fees on e.g Dogecoin
      // Since UTXOs are fairly cheap, we *2 the fees to ensure the Txs are not stuck in the mempool
      const estimatedFees = await getSafeEstimatedFees()
      setNetworkFeeCryptoBaseUnit(estimatedFees.fast.txFee)
      contextDispatch({
        type: ThorchainSaversDepositActionType.SET_DEPOSIT,
        payload: {
          networkFeeCryptoBaseUnit: estimatedFees.fast.txFee,
        },
      })

      const amountCryptoBaseUnit = bnOrZero(state.deposit.cryptoAmount).times(
        bn(10).pow(asset.precision),
      )
      const maybeQuote = await getMaybeThorchainSaversDepositQuote({ asset, amountCryptoBaseUnit })
      if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())
      const quote = maybeQuote.unwrap()

      let maybeGasDeductedCryptoAmountCryptoPrecision = ''
      if (isUtxoChainId(chainId)) {
        if (!maybeFromUTXOAccountAddress) {
          throw new Error('Account address required to deposit in THORChain savers')
        }

        // DO NOT MAKE ME A `useAppSelector()` HOOK
        // DO NOT extract store.getState() to a component/module-scope variable
        // React reconciliation algorithm makes it so this wouldn't change until the next time this is fired
        // But the balance actually changes from the gas fees of the reconciliation Tx if it's fired
        // So the next time we fire the actual send Tx, we should deduct from the udpated balance
        const assetBalanceCryptoBaseUnit = selectPortfolioCryptoBalanceBaseUnitByFilter(
          store.getState(),
          assetBalanceFilter,
        )
        const fastFeesBaseUnit = estimatedFees.fast.txFee

        setNetworkFeeCryptoBaseUnit(fastFeesBaseUnit)
        contextDispatch({
          type: ThorchainSaversDepositActionType.SET_DEPOSIT,
          payload: {
            networkFeeCryptoBaseUnit: fastFeesBaseUnit,
          },
        })

        const cryptoAmountBaseUnit = bnOrZero(state.deposit.cryptoAmount).times(
          bn(10).pow(asset.precision),
        )

        const needsFeeDeduction = cryptoAmountBaseUnit
          .plus(fastFeesBaseUnit)
          .gte(assetBalanceCryptoBaseUnit)

        if (state?.deposit.sendMax) {
          maybeGasDeductedCryptoAmountCryptoPrecision = bnOrZero(assetBalanceCryptoBaseUnit)
            .minus(bn(fastFeesBaseUnit).times(TXS_BUFFER))
            .div(bn(10).pow(asset.precision))
            .toFixed()
        } else if (needsFeeDeduction)
          // We tend to overestimate so that SHOULD be safe but this is both
          // a safety factor as well as ensuring we keep a bit of gas away for another Tx
          maybeGasDeductedCryptoAmountCryptoPrecision = bnOrZero(state.deposit.cryptoAmount)
            .minus(bn(fastFeesBaseUnit).times(TXS_BUFFER).div(bn(10).pow(asset.precision)))
            .toFixed()
      }

      const memoUtf8 = quote.memo

      const sendInput: SendInput = {
        cryptoAmount: maybeGasDeductedCryptoAmountCryptoPrecision || state.deposit.cryptoAmount,
        assetId,
        to: quote.inbound_address,
        from: maybeFromUTXOAccountAddress,
        sendMax: Boolean(state?.deposit.sendMax),
        accountId,
        memo: supportedEvmChainIds.includes(chainId)
          ? utils.hexlify(utils.toUtf8Bytes(memoUtf8))
          : memoUtf8,
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
    contextDispatch,
    accountId,
    assetId,
    state?.deposit.cryptoAmount,
    state?.deposit.sendMax,
    getSafeEstimatedFees,
    asset,
    chainId,
    maybeFromUTXOAccountAddress,
    supportedEvmChainIds,
    selectedCurrency,
    assetBalanceFilter,
  ])

  const getPreDepositInput: () => Promise<SendInput | undefined> = useCallback(async () => {
    if (!(accountId && assetId && state?.deposit?.estimatedGasCryptoPrecision)) return

    try {
      const estimatedFees = await estimateFees(await getEstimateFeesArgs())
      const amountCryptoBaseUnit = bnOrZero(state?.deposit.cryptoAmount).times(
        bn(10).pow(asset.precision),
      )
      const maybeQuote = await getMaybeThorchainSaversDepositQuote({ asset, amountCryptoBaseUnit })
      if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())
      const quote = maybeQuote.unwrap()

      if (isUtxoChainId(chainId) && !maybeFromUTXOAccountAddress) {
        throw new Error('Account address required to deposit in THORChain savers')
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
    state?.deposit?.estimatedGasCryptoPrecision,
    state?.deposit.cryptoAmount,
    getEstimateFeesArgs,
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

    const depositInput = await getDepositInput()
    if (!depositInput) throw new Error('Error building send input')
    if (!walletState?.wallet) throw new Error('Wallet is required')

    // Try/catching and evaluating to something in the catch isn't a good pattern usually
    // In our case, handleSend() catching means that after all our previous checks, building a Tx failed at coinselect time
    // So we actually send reconciliate a reconciliate Tx, retry the original send within the same block
    // and finally evaluate to either the original Tx or a falsy empty string
    // 1. Try to deposit from the originally deposited from / highest UTXO balance address
    // If this is enough, no other Tx is needed
    const txId = await handleSend({
      sendInput: depositInput,
      wallet: walletState.wallet,
    }).catch(async e => {
      if (!isUtxoChainId(chainId)) throw e

      // 2. coinselect threw when building a Tx, meaning there's not enough value in the picked address - send funds to it
      const preDepositInput = await getPreDepositInput()
      if (!preDepositInput) throw new Error('Error building send input')

      return handleSend({
        sendInput: preDepositInput,
        wallet: walletState.wallet!,
      }).then(async () => {
        // Safety factor for the Tx to be seen in the mempool
        await new Promise(resolve => setTimeout(resolve, 5000))
        // We get a fresh deposit input, since amounts close to 100% balance might not work anymore after a pre-tx
        const depositInput = await getDepositInput()
        if (!depositInput) throw new Error('Error building send input')
        // 3. Sign and broadcast the depooosit Tx again
        return handleSend({
          sendInput: depositInput,
          wallet: walletState.wallet!,
        })
      })
    })

    return txId
  }, [chainId, getDepositInput, getPreDepositInput, walletState.wallet])

  useEffect(() => {
    if (!(accountId && chainAdapter && walletState?.wallet && bip44Params && accountType)) return
    ;(async () => {
      const accountAddress = isUtxoChainId(chainId)
        ? await getThorchainSaversPosition({ accountId, assetId })
            .then(position => {
              if (!position) throw new Error(`No position found for assetId: ${assetId}`)
              const { asset_address } = position
              return chainId === bchChainId ? `bitcoincash:${asset_address}` : asset_address
            })
            .catch(async () => {
              const firstReceiveAddress = await chainAdapter.getAddress({
                wallet: walletState.wallet!,
                accountNumber: bip44Params.accountNumber,
                accountType,
                index: 0,
              })

              return firstReceiveAddress
            })
        : ''

      setMaybeFromUTXOAccountAddress(accountAddress)
    })()
  }, [chainId, accountId, assetId, chainAdapter, walletState.wallet, bip44Params, accountType])

  const handleDeposit = useCallback(async () => {
    if (!contextDispatch || !bip44Params || !accountId || !assetId) return
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

      if (!state?.deposit.cryptoAmount) {
        throw new Error('Cannot send 0-value THORCHain savers Tx')
      }

      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })

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

      const depositInput = await getDepositInput()
      if (!depositInput) throw new Error('Error building send input')

      const maybeTxId = await handleMultiTxSend()

      if (!maybeTxId) {
        throw new Error('Error sending THORCHain savers Txs')
      }

      contextDispatch({
        type: ThorchainSaversDepositActionType.SET_DEPOSIT,
        payload: {
          protocolFeeCryptoBaseUnit,
          maybeFromUTXOAccountAddress,
        },
      })
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_TXID, payload: maybeTxId })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvents.DepositConfirm,
        {
          opportunity,
          fiatAmounts: [state.deposit.fiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoHuman: state.deposit.cryptoAmount }],
        },
        assets,
      )
    } catch (error) {
      console.error(error)
      // TODO(gomes): UTXO reconciliation in a stacked PR
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
    assets,
    contextDispatch,
    bip44Params,
    accountId,
    assetId,
    userAddress,
    assetReference,
    walletState.wallet,
    opportunity,
    chainAdapter,
    state?.deposit.cryptoAmount,
    state?.deposit.fiatAmount,
    appDispatch,
    getDepositInput,
    handleMultiTxSend,
    protocolFeeCryptoBaseUnit,
    maybeFromUTXOAccountAddress,
    onNext,
    toast,
    translate,
  ])

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(assetBalanceCryptoBaseUnit)
        .minus(state?.deposit.estimatedGasCryptoPrecision ?? 0)
        .gte(0),
    [assetBalanceCryptoBaseUnit, state?.deposit.estimatedGasCryptoPrecision],
  )

  useEffect(() => {
    if (!hasEnoughBalanceForGas) {
      mixpanel?.track(MixPanelEvents.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  if (!state || !contextDispatch) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      onConfirm={handleDeposit}
      isDisabled={!hasEnoughBalanceForGas}
      loading={state.loading}
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
            <Amount.Crypto value={slippageCryptoAmountPrecision ?? ''} symbol={asset.symbol} />
          </Row.Value>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <HelperTooltip label={translate('defi.modals.saversVaults.timeToBreakEven.tooltip')}>
              {translate('defi.modals.saversVaults.timeToBreakEven.title')}
            </HelperTooltip>
          </Row.Label>
          <Row.Value>
            {translate(
              `defi.modals.saversVaults.${bnOrZero(daysToBreakEven).eq(1) ? 'day' : 'days'}`,
              { amount: daysToBreakEven ?? '0' },
            )}
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
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(protocolFeeCryptoBaseUnit)
                  .div(bn(10).pow(asset.precision))
                  .times(feeMarketData.price)
                  .toFixed()}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(protocolFeeCryptoBaseUnit)
                  .div(bn(10).pow(asset.precision))
                  .toFixed()}
                symbol={asset.symbol}
              />
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
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(networkFeeCryptoBaseUnit)
                  .div(bn(10).pow(asset.precision))
                  .times(feeMarketData.price)
                  .toFixed()}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(networkFeeCryptoBaseUnit)
                  .div(bn(10).pow(asset.precision))
                  .toFixed()}
                symbol={asset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Summary>
      {!hasEnoughBalanceForGas && (
        <Alert status='error' borderRadius='lg'>
          <AlertIcon />
          <Text translation={['modals.confirm.notEnoughGas', { assetSymbol: asset.symbol }]} />
        </Alert>
      )}
    </ReusableConfirm>
  )
}
