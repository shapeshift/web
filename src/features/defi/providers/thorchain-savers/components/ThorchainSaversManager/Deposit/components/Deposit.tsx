import { Skeleton, useToast } from '@chakra-ui/react'
import { MaxUint256 } from '@ethersproject/constants'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput, UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads/build'
import { Ok } from '@sniptt/monads/build'
import { getConfig } from 'config'
import { getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import { Deposit as ReusableDeposit } from 'features/defi/components/Deposit/Deposit'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import debounce from 'lodash/debounce'
import qs from 'qs'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { getSupportedEvmChainIds } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { useRouterContractAddress } from 'lib/swapper/swappers/ThorchainSwapper/utils/useRouterContractAddress'
import type { SwapErrorRight } from 'lib/swapper/types'
import { isToken } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  createBuildCustomTxInput,
  getErc20Allowance,
  getFees,
} from 'lib/utils/evm'
import {
  BASE_BPS_POINTS,
  fromThorBaseUnit,
  getMaybeThorchainSaversDepositQuote,
  isAboveDepositDustThreshold,
  makeDaysToBreakEven,
  THORCHAIN_SAVERS_DUST_THRESHOLDS,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFeeAssetById,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ThorchainSaversDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type DepositProps = StepComponentProps & {
  accountId?: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Deposit: React.FC<DepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const [outboundFeeCryptoBaseUnit, setOutboundFeeCryptoBaseUnit] = useState('')
  const [isApprovalRequired, setIsApprovalRequired] = useState(false)
  const { state, dispatch: contextDispatch } = useContext(DepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const [slippageCryptoAmountPrecision, setSlippageCryptoAmountPrecision] = useState<string | null>(
    null,
  )
  const [daysToBreakEven, setDaysToBreakEven] = useState<string | null>(null)
  const [inputValues, setInputValues] = useState<{
    fiatAmount: string
    cryptoAmount: string
  } | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const assets = useAppSelector(selectAssets)

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const isTokenDeposit = isToken(fromAssetId(assetId).assetReference)

  const accountNumberFilter = useMemo(() => ({ accountId }), [accountId])
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )

  const {
    state: { wallet },
  } = useWallet()

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const opportunityId = useMemo(
    () => (assetId ? toOpportunityId({ chainId, assetNamespace, assetReference }) : undefined),
    [assetId, assetNamespace, assetReference, chainId],
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
        accountId ?? highestBalanceAccountId ?? '',
        opportunityId ?? '',
      ),
    }),
    [accountId, highestBalanceAccountId, opportunityId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const userAddress: string | undefined = accountId && fromAccountId(accountId).account
  const balanceFilter = useMemo(() => ({ assetId, accountId }), [accountId, assetId])
  // user info
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, balanceFilter),
  )

  const getOutboundFeeCryptoBaseUnit = useCallback(async (): Promise<string> => {
    if (!assetId) return '0'

    // We only want to display the outbound fee as a minimum for assets which have a zero dust threshold i.e EVM and Cosmos assets
    if (!bn(THORCHAIN_SAVERS_DUST_THRESHOLDS[assetId]).isZero()) return '0'
    const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
    const maybeInboundAddressData = await getInboundAddressDataForChain(daemonUrl, assetId)

    return maybeInboundAddressData
      .match<Result<string, SwapErrorRight>>({
        ok: ({ outbound_fee }) => {
          const outboundFeeCryptoBaseUnit = toBaseUnit(
            fromThorBaseUnit(outbound_fee),
            asset.precision,
          )

          return Ok(outboundFeeCryptoBaseUnit)
        },
        err: _err => Ok('0'),
      })
      .unwrap()
  }, [asset.precision, assetId])

  useEffect(() => {
    ;(async () => {
      if (outboundFeeCryptoBaseUnit) return

      const outboundFee = await getOutboundFeeCryptoBaseUnit()
      if (!outboundFee) return

      setOutboundFeeCryptoBaseUnit(outboundFee)
    })()
  }, [getOutboundFeeCryptoBaseUnit, outboundFeeCryptoBaseUnit])
  // notify
  const toast = useToast()

  const supportedEvmChainIds = useMemo(() => getSupportedEvmChainIds(), [])

  const saversRouterContractAddress = useRouterContractAddress({
    feeAssetId: feeAsset?.assetId ?? '',
    skip: !isTokenDeposit || !feeAsset?.assetId,
  })

  useEffect(() => {
    if (!inputValues || !accountId)
      return // Router contract address is only set in case we're depositting a token, not a native asset
    ;(async () => {
      const isApprovalRequired = await (async () => {
        if (!saversRouterContractAddress) return false
        const allowanceOnChainCryptoBaseUnit = await getErc20Allowance({
          address: fromAssetId(assetId).assetReference,
          spender: saversRouterContractAddress,
          from: fromAccountId(accountId).account,
          chainId: asset.chainId,
        })
        const { cryptoAmount } = inputValues

        const cryptoAmountBaseUnit = toBaseUnit(cryptoAmount, asset.precision)

        if (bn(cryptoAmountBaseUnit).gt(allowanceOnChainCryptoBaseUnit)) return true
        return false
      })()
      setIsApprovalRequired(isApprovalRequired)
    })()
  }, [accountId, asset.chainId, asset.precision, assetId, inputValues, saversRouterContractAddress])

  const getDepositGasEstimateCryptoPrecision = useCallback(
    async (deposit: DepositValues): Promise<string | undefined> => {
      if (
        !(
          userAddress &&
          assetReference &&
          accountId &&
          opportunityData &&
          accountNumber !== undefined &&
          wallet &&
          feeAsset
        )
      )
        return
      try {
        const amountCryptoBaseUnit = toBaseUnit(deposit.cryptoAmount, asset.precision)

        const maybeQuote = await getMaybeThorchainSaversDepositQuote({
          asset,
          amountCryptoBaseUnit,
        })
        if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())
        const quote = maybeQuote.unwrap()

        const chainAdapters = getChainAdapterManager()

        // We can only estimate the gas at this stage if allowance is already granted
        // Else, the Tx simulation will fail
        if (isTokenDeposit && !isApprovalRequired) {
          const thorContract = getOrCreateContractByType({
            address: saversRouterContractAddress!,
            type: ContractType.ThorRouter,
            chainId: asset.chainId,
          })

          const data = thorContract.interface.encodeFunctionData('depositWithExpiry', [
            quote.inbound_address,
            fromAssetId(assetId).assetReference,
            amountCryptoBaseUnit.toString(),
            quote.memo,
            quote.expiry,
          ])

          const adapter = assertGetEvmChainAdapter(chainId)

          const customTxInput = await createBuildCustomTxInput({
            accountNumber,
            adapter,
            data,
            value: '0', // this is not a token send, but a smart contract call so we don't send anything here, THOR router does
            to: saversRouterContractAddress!,
            wallet,
          })

          const fees = await adapter.getFeeData({
            to: customTxInput.to,
            value: customTxInput.value,
            chainSpecific: {
              from: fromAccountId(accountId).account,
              data: customTxInput.data,
            },
          })

          const fastFeeCryptoBaseUnit = fees.fast.txFee

          const fastFeeCryptoPrecision = bnOrZero(
            bn(fastFeeCryptoBaseUnit).div(bn(10).pow(feeAsset.precision)),
          )

          return fastFeeCryptoPrecision.toString()
        }

        // We're lying to Ts, this isn't always an UtxoBaseAdapter
        // But typing this as any chain-adapter won't narrow down its type and we'll have errors at `chainSpecific` property
        const adapter = chainAdapters.get(chainId) as unknown as UtxoBaseAdapter<UtxoChainId>
        const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
          to: quote.inbound_address,
          value: amountCryptoBaseUnit,
          // EVM chains are the only ones explicitly requiring a `from` param for the gas estimation to work
          // UTXOs simply call /api/v1/fees (common for all accounts), and Cosmos assets fees are hardcoded
          chainSpecific: {
            pubkey: userAddress,
            from: supportedEvmChainIds.includes(chainId) ? userAddress : '',
          },
          sendMax: Boolean(state?.deposit.sendMax),
        }
        const fastFeeCryptoBaseUnit = (await adapter.getFeeData(getFeeDataInput)).fast.txFee

        const fastFeeCryptoPrecision = bnOrZero(
          bn(fastFeeCryptoBaseUnit).div(bn(10).pow(asset.precision)),
        )
        return bnOrZero(fastFeeCryptoPrecision).toString()
      } catch (error) {
        console.error(error)
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
      }
    },
    [
      userAddress,
      assetReference,
      accountId,
      opportunityData,
      accountNumber,
      wallet,
      feeAsset,
      asset,
      isTokenDeposit,
      isApprovalRequired,
      chainId,
      supportedEvmChainIds,
      state?.deposit.sendMax,
      saversRouterContractAddress,
      assetId,
      toast,
      translate,
    ],
  )

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (
        !(userAddress && opportunityData && inputValues && accountId && contextDispatch && feeAsset)
      )
        return
      // set deposit state for future use
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_DEPOSIT, payload: formValues })
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })
      try {
        const estimatedGasCryptoPrecision = await getDepositGasEstimateCryptoPrecision(formValues)
        if (!estimatedGasCryptoPrecision) return
        contextDispatch({
          type: ThorchainSaversDepositActionType.SET_DEPOSIT,
          payload: { estimatedGasCryptoPrecision },
        })

        const approvalFees = await (() => {
          if (
            !isApprovalRequired ||
            !saversRouterContractAddress ||
            accountNumber === undefined ||
            !wallet
          )
            return undefined

          const contract = getOrCreateContractByType({
            address: fromAssetId(assetId).assetReference,
            type: ContractType.ERC20,
            chainId: asset.chainId,
          })
          if (!contract) return undefined

          const data = contract.interface.encodeFunctionData('approve', [
            saversRouterContractAddress,
            MaxUint256,
          ])

          const adapter = assertGetEvmChainAdapter(chainId)

          return getFees({
            accountNumber,
            adapter,
            data,
            to: fromAssetId(assetId).assetReference,
            value: '0',
            wallet,
          })
        })()
        if (approvalFees) {
          contextDispatch({
            type: ThorchainSaversDepositActionType.SET_APPROVE,
            payload: {
              estimatedGasCryptoPrecision: bnOrZero(approvalFees.networkFeeCryptoBaseUnit)
                .div(bn(10).pow(feeAsset.precision))
                .toString(),
            },
          })

          onNext(DefiStep.Approve)
          return
        }
        onNext(DefiStep.Confirm)
        trackOpportunityEvent(
          MixPanelEvents.DepositContinue,
          {
            opportunity: opportunityData,
            fiatAmounts: [formValues.fiatAmount],
            cryptoAmounts: [{ assetId, amountCryptoHuman: formValues.cryptoAmount }],
          },
          assets,
        )
      } catch (error) {
        console.error(error)
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
        contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
      } finally {
        contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
      }
    },
    [
      userAddress,
      opportunityData,
      inputValues,
      accountId,
      contextDispatch,
      feeAsset,
      getDepositGasEstimateCryptoPrecision,
      onNext,
      isApprovalRequired,
      assetId,
      assets,
      saversRouterContractAddress,
      accountNumber,
      wallet,
      asset.chainId,
      chainId,
      toast,
      translate,
    ],
  )

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const valueCryptoBaseUnit = toBaseUnit(value, asset.precision)
      const isBelowMinSellAmount = !isAboveDepositDustThreshold({ valueCryptoBaseUnit, assetId })
      const isBelowOutboundFee =
        bn(outboundFeeCryptoBaseUnit).gt(0) &&
        bnOrZero(valueCryptoBaseUnit).lt(outboundFeeCryptoBaseUnit)

      const minLimitCryptoPrecision = bn(THORCHAIN_SAVERS_DUST_THRESHOLDS[assetId]).div(
        bn(10).pow(asset.precision),
      )
      const outboundFeeCryptoPrecision = bn(outboundFeeCryptoBaseUnit).div(
        bn(10).pow(asset.precision),
      )
      const minLimit = `${minLimitCryptoPrecision} ${asset.symbol}`
      const outboundFeeLimit = `${outboundFeeCryptoPrecision} ${asset.symbol}`

      if (isBelowMinSellAmount) return translate('trade.errors.amountTooSmall', { minLimit })
      if (isBelowOutboundFee)
        return translate('trade.errors.amountTooSmall', { minLimit: outboundFeeLimit })

      const cryptoBalancePrecision = bnOrZero(balance).div(bn(10).pow(asset.precision))
      const valueCryptoPrecision = bnOrZero(value)
      const hasValidBalance =
        cryptoBalancePrecision.gt(0) &&
        valueCryptoPrecision.gt(0) &&
        cryptoBalancePrecision.gte(value)
      if (valueCryptoPrecision.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [asset.precision, asset.symbol, assetId, outboundFeeCryptoBaseUnit, translate, balance],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(balance).div(bn(10).pow(asset.precision))

      const valueCryptoBaseUnit = bnOrZero(value)
        .div(marketData.price)
        .times(bn(10).pow(asset.precision))
      const isBelowMinSellAmount = !isAboveDepositDustThreshold({ valueCryptoBaseUnit, assetId })
      const isBelowOutboundFee = bnOrZero(valueCryptoBaseUnit).lt(outboundFeeCryptoBaseUnit)

      const minLimitCryptoPrecision = bn(THORCHAIN_SAVERS_DUST_THRESHOLDS[assetId]).div(
        bn(10).pow(asset.precision),
      )
      const outboundFeeCryptoPrecision = bn(outboundFeeCryptoBaseUnit).div(
        bn(10).pow(asset.precision),
      )
      const minLimit = `${minLimitCryptoPrecision} ${asset.symbol}`
      const outboundFeeLimit = `${outboundFeeCryptoPrecision} ${asset.symbol}`

      if (isBelowMinSellAmount) return translate('trade.errors.amountTooSmall', { minLimit })
      if (isBelowOutboundFee)
        return translate('trade.errors.amountTooSmall', { minLimit: outboundFeeLimit })

      const fiat = crypto.times(marketData.price)
      const _value = bnOrZero(value)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [
      balance,
      asset.precision,
      asset.symbol,
      marketData.price,
      assetId,
      outboundFeeCryptoBaseUnit,
      translate,
    ],
  )

  const cryptoAmountAvailable = useMemo(
    () => bnOrZero(balance).div(bn(10).pow(asset.precision)),
    [balance, asset?.precision],
  )
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(cryptoAmountAvailable).times(marketData.price),
    [cryptoAmountAvailable, marketData?.price],
  )

  const handleSendMax = useCallback(
    (isSendMax?: boolean) => {
      if (!contextDispatch) return

      contextDispatch({
        type: ThorchainSaversDepositActionType.SET_DEPOSIT,
        payload: { sendMax: Boolean(isSendMax) },
      })
    },
    [contextDispatch],
  )
  const handlePercentClick = useCallback(
    (percent: number) => handleSendMax(percent === 1),
    [handleSendMax],
  )

  useEffect(() => {
    if (!opportunityData?.apy) return
    if (!(accountId && inputValues && asset && feeAsset)) return
    const { cryptoAmount } = inputValues
    const amountCryptoBaseUnit = toBaseUnit(cryptoAmount, asset.precision)

    if (bn(amountCryptoBaseUnit).isZero()) return

    const debounced = debounce(async () => {
      setQuoteLoading(true)
      const maybeQuote = await getMaybeThorchainSaversDepositQuote({
        asset,
        amountCryptoBaseUnit,
      })

      if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())

      const quote = maybeQuote.unwrap()
      const { slippage_bps, expected_amount_out: expectedAmountOutThorBaseUnit } = quote

      const slippagePercentage = bnOrZero(slippage_bps).div(BASE_BPS_POINTS).times(100)
      // slippage going into position - 0.007 ETH for 5 ETH deposit
      // This is NOT the same as the total THOR fees, which include the deposit fee in addition to the slippage
      const cryptoSlippageAmountPrecision = bnOrZero(cryptoAmount)
        .times(slippagePercentage)
        .div(100)
      setSlippageCryptoAmountPrecision(cryptoSlippageAmountPrecision.toString())

      // daily upside
      const daysToBreakEven = makeDaysToBreakEven({
        expectedAmountOutThorBaseUnit,
        amountCryptoBaseUnit,
        asset,
        apy: opportunityData?.apy,
      })
      setDaysToBreakEven(daysToBreakEven)
      setQuoteLoading(false)
    })

    debounced()

    // cancel the previous debounce when inputValues changes to avoid race conditions
    // and always ensure the latest value is used
    return debounced.cancel
  }, [accountId, asset, feeAsset, inputValues, isTokenDeposit, opportunityData?.apy])

  const handleInputChange = (fiatAmount: string, cryptoAmount: string) => {
    setInputValues({ fiatAmount, cryptoAmount })
  }

  const handleBack = useCallback(() => {
    history.push({
      pathname: `/defi/earn`,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [history, query])

  if (!state || !contextDispatch || !opportunityData) return null

  return (
    <ReusableDeposit
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={asset}
      apy={bnOrZero(opportunityData?.apy).toString()}
      cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
      cryptoInputValidation={{
        required: true,
        validate: { validateCryptoAmount },
      }}
      fiatAmountAvailable={fiatAmountAvailable.toFixed(2)}
      fiatInputValidation={{
        required: true,
        validate: { validateFiatAmount },
      }}
      marketData={marketData}
      onCancel={handleCancel}
      onPercentClick={handlePercentClick}
      onContinue={handleContinue}
      onBack={handleBack}
      onChange={handleInputChange}
      percentOptions={[0.25, 0.5, 0.75, 1]}
      enableSlippage={false}
      isLoading={state.loading}
    >
      <Row>
        <Row.Label>{translate('common.slippage')}</Row.Label>
        <Row.Value>
          <Skeleton isLoaded={!quoteLoading}>
            <Amount.Crypto value={slippageCryptoAmountPrecision ?? ''} symbol={asset.symbol} />
          </Skeleton>
        </Row.Value>
      </Row>
      <Row>
        <Row.Label>
          <HelperTooltip label={translate('defi.modals.saversVaults.timeToBreakEven.tooltip')}>
            {translate('defi.modals.saversVaults.timeToBreakEven.title')}
          </HelperTooltip>
        </Row.Label>
        <Row.Value>
          <Skeleton isLoaded={!quoteLoading}>
            {translate(
              `defi.modals.saversVaults.${bnOrZero(daysToBreakEven).eq(1) ? 'day' : 'days'}`,
              { amount: daysToBreakEven ?? '0' },
            )}
          </Skeleton>
        </Row.Value>
      </Row>
    </ReusableDeposit>
  )
}
