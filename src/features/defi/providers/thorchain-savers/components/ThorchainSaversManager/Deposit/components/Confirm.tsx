import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Flex,
  Stack,
  useToast,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION, FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { BuildCustomTxInput } from '@shapeshiftoss/chain-adapters/src/evm/types'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
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
import { encodeFunctionData, getAddress, stringToBytes, toHex } from 'viem'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import type { SendInput } from 'components/Modals/Send/Form'
import type { EstimateFeesInput } from 'components/Modals/Send/utils'
import { estimateFees, handleSend } from 'components/Modals/Send/utils'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { isToken, tokenOrUndefined } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
  getSupportedEvmChainIds,
} from 'lib/utils/evm'
import { fromThorBaseUnit, getThorchainFromAddress, toThorBaseUnit } from 'lib/utils/thorchain'
import { BASE_BPS_POINTS } from 'lib/utils/thorchain/constants'
import { getInboundAddressDataForChain } from 'lib/utils/thorchain/getInboundAddressDataForChain'
import {
  getMaybeThorchainSaversDepositQuote,
  getThorchainSaversPosition,
  makeDaysToBreakEven,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectAssets,
  selectFeeAssetById,
  selectMarketDataById,
  selectPortfolioAccountMetadataByAccountId,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectSelectedCurrency,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

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
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  // TODO: Allow user to set fee priority
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const opportunity = useMemo(() => state?.opportunity, [state])
  const assets = useAppSelector(selectAssets)

  const chainAdapter = getChainAdapterManager().get(chainId)!

  const supportedEvmChainIds = useMemo(() => getSupportedEvmChainIds(), [])

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const [maybeFromUTXOAccountAddress, setMaybeFromUTXOAccountAddress] = useState<string>('')
  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${assetId}`)

  const isTokenDeposit = isToken(fromAssetId(assetId).assetReference)

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId ?? ''))
  const feeMarketData = useAppSelector(state =>
    selectMarketDataById(state, feeAsset?.assetId ?? ''),
  )

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountFilter),
  )
  const accountType = accountMetadata?.accountType
  const bip44Params = accountMetadata?.bip44Params
  const userAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : ''),
    [accountId],
  )
  const accountNumberFilter = useMemo(() => ({ accountId }), [accountId])
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )

  // user info
  const {
    state: { wallet },
  } = useWallet()

  // notify
  const toast = useToast()

  const assetBalanceFilter = useMemo(
    () => ({ assetId: asset?.assetId, accountId }),
    [accountId, asset?.assetId],
  )

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId }),
    [accountId, feeAsset?.assetId],
  )

  const feeAssetBalanceCryptoBaseUnit = useAppSelector(s =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(s, feeAssetBalanceFilter),
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

      const {
        expected_amount_deposit: expectedAmountOutThorBaseUnit,
        fees: { slippage_bps },
      } = quote

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

  const getEstimateFeesArgs: () => Promise<EstimateFeesInput | undefined> =
    useCallback(async () => {
      if (isTokenDeposit) return
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
          fromThorBaseUnit(amountCryptoThorBaseUnit.minus(quote.expected_amount_deposit)),
          asset.precision,
        ),
      )

      const memoUtf8 = quote.memo
      return {
        cryptoAmount: state.deposit.cryptoAmount,
        assetId,
        from: maybeFromUTXOAccountAddress,
        to: quote.inbound_address,
        memo: supportedEvmChainIds.includes(chainId as KnownChainIds)
          ? toHex(stringToBytes(memoUtf8))
          : memoUtf8,
        sendMax: Boolean(!isUtxoChainId(chainId) && state?.deposit.sendMax),
        accountId,
        contractAddress: tokenOrUndefined(fromAssetId(asset.assetId).assetReference),
      }
    }, [
      accountId,
      asset,
      assetId,
      chainId,
      isTokenDeposit,
      maybeFromUTXOAccountAddress,
      state?.deposit.cryptoAmount,
      state?.deposit.sendMax,
      supportedEvmChainIds,
    ])

  const getEstimatedFees = useCallback(async () => {
    if (isUtxoChainId(chainId) && !maybeFromUTXOAccountAddress) {
      // UTXO from address not fetched yet
      return
    }

    const estimateFeesArgs = await getEstimateFeesArgs()
    if (!estimateFeesArgs) return
    return estimateFees(estimateFeesArgs)
  }, [chainId, getEstimateFeesArgs, maybeFromUTXOAccountAddress])

  const getCustomTxInput: () => Promise<BuildCustomTxInput | undefined> = useCallback(async () => {
    if (!contextDispatch) return
    if (!(accountId && assetId && feeAsset && accountNumber !== undefined && wallet)) return
    if (!state?.deposit.cryptoAmount) {
      throw new Error('Cannot send 0-value THORCHain savers Tx')
    }

    try {
      const adapter = assertGetEvmChainAdapter(chainId)

      const amountCryptoBaseUnit = toBaseUnit(state.deposit.cryptoAmount, asset.precision)
      const maybeQuote = await getMaybeThorchainSaversDepositQuote({ asset, amountCryptoBaseUnit })
      if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())
      const quote = maybeQuote.unwrap()

      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      const maybeInboundAddressData = await getInboundAddressDataForChain(
        daemonUrl,
        feeAsset?.assetId,
      )
      if (maybeInboundAddressData.isErr())
        throw new Error(maybeInboundAddressData.unwrapErr().message)
      const inboundAddressData = maybeInboundAddressData.unwrap()
      // Guaranteed to be defined for EVM chains, and approve are only for EVM chains
      const router = inboundAddressData.router!

      const thorContract = getOrCreateContractByType({
        address: router,
        type: ContractType.ThorRouter,
        chainId: asset.chainId,
      })

      const data = encodeFunctionData({
        abi: thorContract.abi,
        functionName: 'depositWithExpiry',
        args: [
          getAddress(quote.inbound_address),
          getAddress(fromAssetId(assetId).assetReference),
          BigInt(amountCryptoBaseUnit.toString()),
          quote.memo,
          BigInt(quote.expiry),
        ],
      })

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber,
        adapter,
        data,
        value: '0', // this is not a token send, but a smart contract call so we don't send anything here, THOR router does
        to: router,
        wallet,
      })

      return buildCustomTxInput
    } catch (e) {
      console.error(e)
    }
  }, [
    contextDispatch,
    accountId,
    assetId,
    feeAsset,
    accountNumber,
    wallet,
    state?.deposit.cryptoAmount,
    chainId,
    asset,
  ])

  const getCustomTxFees = useCallback(async () => {
    if (!wallet || !accountId) return

    const adapter = assertGetEvmChainAdapter(chainId)
    const customTxInput = await getCustomTxInput()
    if (!customTxInput) return undefined

    const fees = await adapter.getFeeData({
      to: customTxInput.to,
      value: customTxInput.value,
      chainSpecific: {
        from: fromAccountId(accountId).account,
        data: customTxInput.data,
      },
    })

    return fees
  }, [accountId, chainId, getCustomTxInput, wallet])

  useEffect(() => {
    if (!contextDispatch) return
    ;(async () => {
      // TODO(gomes): use new fees estimation hook here instead once support for non-UTXO chains and EVM assets is handled at consumption level
      const estimatedFees = await (isTokenDeposit ? getCustomTxFees() : getEstimatedFees())
      if (!estimatedFees) return

      setNetworkFeeCryptoBaseUnit(estimatedFees.fast.txFee)
      contextDispatch({
        type: ThorchainSaversDepositActionType.SET_DEPOSIT,
        payload: {
          networkFeeCryptoBaseUnit: estimatedFees.fast.txFee,
        },
      })
    })()
  }, [
    contextDispatch,
    getCustomTxFees,
    getEstimatedFees,
    isTokenDeposit,
    state?.deposit.estimatedGasCryptoPrecision,
  ])

  const getSendInput: () => Promise<SendInput | undefined> = useCallback(async () => {
    if (isTokenDeposit) return
    if (!contextDispatch) return
    if (!(accountId && assetId && feeAsset)) return
    if (!state?.deposit.cryptoAmount) {
      throw new Error('Cannot send 0-value THORCHain savers Tx')
    }

    try {
      const estimatedFees = await getEstimatedFees()
      if (!estimatedFees) return
      setNetworkFeeCryptoBaseUnit(estimatedFees.fast.txFee)
      contextDispatch({
        type: ThorchainSaversDepositActionType.SET_DEPOSIT,
        payload: {
          networkFeeCryptoBaseUnit: estimatedFees.fast.txFee,
        },
      })

      const amountCryptoBaseUnit = toBaseUnit(state.deposit.cryptoAmount, asset.precision)

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

        const cryptoAmountBaseUnit = toBaseUnit(state.deposit.cryptoAmount, asset.precision)

        const needsFeeDeduction = bn(cryptoAmountBaseUnit)
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
        memo: supportedEvmChainIds.includes(chainId as KnownChainIds)
          ? toHex(stringToBytes(memoUtf8))
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
    isTokenDeposit,
    contextDispatch,
    accountId,
    assetId,
    feeAsset,
    state?.deposit.cryptoAmount,
    state?.deposit.sendMax,
    getEstimatedFees,
    asset,
    chainId,
    maybeFromUTXOAccountAddress,
    supportedEvmChainIds,
    selectedCurrency,
    assetBalanceFilter,
  ])

  const handleCustomTx = useCallback(async (): Promise<string | undefined> => {
    if (!wallet) return
    const buildCustomTxInput = await getCustomTxInput()
    if (!buildCustomTxInput) return

    const adapter = assertGetEvmChainAdapter(chainId)

    const txid = await buildAndBroadcast({
      adapter,
      buildCustomTxInput,
      receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
    })
    return txid
  }, [wallet, getCustomTxInput, chainId])

  useEffect(() => {
    if (!(accountId && chainAdapter && wallet && bip44Params && accountType)) return
    ;(async () => {
      const accountAddress = await getThorchainFromAddress({
        accountId,
        assetId,
        wallet,
        accountMetadata,
        getPosition: getThorchainSaversPosition,
      })

      setMaybeFromUTXOAccountAddress(accountAddress)
    })()
  }, [accountId, accountMetadata, accountType, assetId, bip44Params, chainAdapter, wallet])

  const { isTradingActive, refetch: refetchIsTradingActive } = useIsTradingActive({
    assetId,
    enabled: !!assetId,
    swapperName: SwapperName.Thorchain,
  })

  const handleDeposit = useCallback(async () => {
    if (!contextDispatch || !bip44Params || !accountId || !assetId) return
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

      const maybeTxId = await (async () => {
        if (isTokenDeposit) {
          return handleCustomTx()
        }
        const sendInput = await getSendInput()
        if (!sendInput) throw new Error('Error building send input')

        const txId = await handleSend({
          sendInput,
          wallet,
        })

        return txId
      })()

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
    userAddress,
    assetReference,
    wallet,
    opportunity,
    chainAdapter,
    state?.deposit.cryptoAmount,
    state?.deposit.fiatAmount,
    isTradingActive,
    refetchIsTradingActive,
    protocolFeeCryptoBaseUnit,
    maybeFromUTXOAccountAddress,
    onNext,
    assets,
    isTokenDeposit,
    getSendInput,
    handleCustomTx,
    toast,
    translate,
  ])

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(feeAssetBalanceCryptoBaseUnit)
        .minus(state?.deposit.estimatedGasCryptoPrecision ?? 0)
        .gte(0),
    [feeAssetBalanceCryptoBaseUnit, state?.deposit.estimatedGasCryptoPrecision],
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
    useIsSmartContractAddress(userAddress)

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
        !userAddress ||
        disableSmartContractDeposit ||
        isTradingActive === false
      }
      loading={state.loading || !userAddress || isAddressByteCodeLoading}
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
                  .div(bn(10).pow(feeAsset.precision))
                  .times(feeMarketData.price)
                  .toFixed()}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(networkFeeCryptoBaseUnit)
                  .div(bn(10).pow(feeAsset.precision))
                  .toFixed()}
                symbol={feeAsset.symbol}
              />
            </Box>
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
