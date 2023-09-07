import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { getConfig } from 'config'
import { getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { ApprovePreFooter } from 'features/defi/components/Approve/ApprovePreFooter'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/utils/constants'
import { isSome, isToken } from 'lib/utils'
import { buildAndBroadcast, createBuildCustomTxInput, getErc20Allowance } from 'lib/utils/evm'
import { getMaybeThorchainSaversDepositQuote } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFeeAssetById,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ThorchainSaversDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type ApproveProps = StepComponentProps & { accountId: AccountId | undefined }

export const Approve: React.FC<ApproveProps> = ({ accountId, onNext }) => {
  const { poll } = usePoll()
  const { state, dispatch } = useContext(DepositContext)
  const estimatedGasCryptoPrecision = state?.approve.estimatedGasCryptoPrecision
  const history = useHistory()
  const translate = useTranslate()
  const toast = useToast()
  const {
    state: { wallet },
  } = useWallet()

  const accountNumberFilter = useMemo(() => ({ accountId }), [accountId])
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )
  const chainAdapterManager = getChainAdapterManager()

  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const [saversRouterContractAddress, setSaversRouterContractAddress] = useState<string | null>(
    null,
  )

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const assets = useAppSelector(selectAssets)
  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))

  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${assetId}`)

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace, assetReference }),
    [assetNamespace, assetReference, chainId],
  )

  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(accountId ?? '', opportunityId),
    }),
    [accountId, opportunityId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const isTokenDeposit = isToken(assetReference)

  const feeMarketData = useAppSelector(state =>
    selectMarketDataById(state, feeAsset?.assetId ?? ''),
  )

  useEffect(() => {
    if (!(accountId && asset && feeAsset && state && dispatch && isTokenDeposit)) return

    if (bnOrZero(state.deposit.cryptoAmount).isZero()) return
    ;(async () => {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      const maybeInboundAddressData = await getInboundAddressDataForChain(
        daemonUrl,
        feeAsset?.assetId,
      )
      if (maybeInboundAddressData.isErr())
        throw new Error(maybeInboundAddressData.unwrapErr().message)

      const inboundAddressData = maybeInboundAddressData.unwrap()

      const router = inboundAddressData.router
      // Should always be defined for EVM tokens, and approves are for EVM tokens only (not native asset), but safety first
      if (!router) throw new Error(`router not found for ChainId ${asset.chainId}`)
      setSaversRouterContractAddress(router)
    })()
  }, [accountId, asset, dispatch, feeAsset, isTokenDeposit, state])

  const handleApprove = useCallback(async () => {
    if (
      !state?.deposit.cryptoAmount ||
      accountNumber === undefined ||
      !wallet ||
      !accountId ||
      !dispatch ||
      !saversRouterContractAddress ||
      !opportunityData
    )
      return

    dispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })

    try {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      const maybeInboundAddressData = await getInboundAddressDataForChain(
        daemonUrl,
        feeAsset?.assetId,
      )
      if (maybeInboundAddressData.isErr())
        throw new Error(maybeInboundAddressData.unwrapErr().message)

      const amountCryptoBaseUnit = bnOrZero(state.deposit.cryptoAmount).times(
        bn(10).pow(asset.precision),
      )

      const poolId = assetIdToPoolAssetId({ assetId: asset.assetId })

      if (!poolId) throw new Error(`poolId not found for assetId ${asset.assetId}`)

      const contract = getOrCreateContractByType({
        address: fromAssetId(assetId).assetReference,
        type: ContractType.ERC20,
      })

      const amountToApprove = state.isExactAllowance
        ? amountCryptoBaseUnit.toFixed(0)
        : MAX_ALLOWANCE

      const data = contract.interface.encodeFunctionData('approve', [
        saversRouterContractAddress,
        amountToApprove,
      ])

      const adapter = chainAdapterManager.get(asset.chainId) as unknown as EvmChainAdapter
      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber,
        adapter,
        data,
        value: '0',
        to: fromAssetId(assetId).assetReference,
        wallet,
      })

      await buildAndBroadcast({ adapter, buildCustomTxInput })
      await poll({
        fn: () =>
          getErc20Allowance({
            address: fromAssetId(assetId).assetReference,
            spender: saversRouterContractAddress,
            from: fromAccountId(accountId).account,
            chainId: asset.chainId,
          }),
        validate: (allowanceCryptoBaseUnit: string) => {
          return bnOrZero(allowanceCryptoBaseUnit).gte(amountCryptoBaseUnit)
        },
        interval: 15000,
        maxAttempts: 60,
      })

      const estimatedDepositGasCryptoPrecision = await (async () => {
        const maybeQuote = await getMaybeThorchainSaversDepositQuote({
          asset,
          amountCryptoBaseUnit,
        })
        if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())
        const quote = maybeQuote.unwrap()
        const thorContract = getOrCreateContractByType({
          address: saversRouterContractAddress!,
          type: ContractType.ThorRouter,
          chainId: asset.chainId,
        })

        const data = thorContract.interface.encodeFunctionData('depositWithExpiry', [
          quote.inbound_address,
          fromAssetId(assetId).assetReference,
          amountCryptoBaseUnit.toFixed(0),
          quote.memo,
          quote.expiry,
        ])

        const adapter = chainAdapterManager.get(asset.chainId) as unknown as EvmChainAdapter

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
      })()

      dispatch({
        type: ThorchainSaversDepositActionType.SET_DEPOSIT,
        payload: { estimatedGasCryptoPrecision: estimatedDepositGasCryptoPrecision },
      })

      trackOpportunityEvent(
        MixPanelEvents.DepositApprove,
        {
          opportunity: opportunityData,
          fiatAmounts: [state.deposit.fiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoHuman: state.deposit.cryptoAmount }],
        },
        assets,
      )

      onNext(DefiStep.Confirm)
      dispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
    } catch (error) {
      console.error(error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
      dispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
    }
  }, [
    accountId,
    accountNumber,
    asset,
    assetId,
    assets,
    chainAdapterManager,
    dispatch,
    feeAsset?.assetId,
    feeAsset.precision,
    onNext,
    opportunityData,
    poll,
    saversRouterContractAddress,
    state?.deposit.cryptoAmount,
    state?.deposit.fiatAmount,
    state?.isExactAllowance,
    toast,
    translate,
    wallet,
  ])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      isSome(accountId) &&
      isSome(estimatedGasCryptoPrecision) &&
      canCoverTxFees({
        feeAsset,
        estimatedGasCryptoPrecision,
        accountId,
      }),
    [accountId, feeAsset, estimatedGasCryptoPrecision],
  )

  const preFooter = useMemo(
    () => (
      <ApprovePreFooter
        accountId={accountId}
        action={DefiAction.Deposit}
        feeAsset={feeAsset}
        estimatedGasCryptoPrecision={estimatedGasCryptoPrecision}
      />
    ),
    [accountId, feeAsset, estimatedGasCryptoPrecision],
  )

  if (!saversRouterContractAddress || !state || !dispatch) return null

  return (
    <ReusableApprove
      asset={asset}
      spenderName={DefiProvider.ThorchainSavers}
      feeAsset={feeAsset}
      estimatedGasFeeCryptoPrecision={bnOrZero(estimatedGasCryptoPrecision).toFixed(5)}
      disabled={!hasEnoughBalanceForGas}
      fiatEstimatedGasFee={bnOrZero(estimatedGasCryptoPrecision)
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approve')}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      preFooter={preFooter}
      isExactAllowance={state.isExactAllowance}
      onCancel={() => history.push('/')}
      onConfirm={handleApprove}
      spenderContractAddress={saversRouterContractAddress}
      onToggle={() =>
        dispatch({
          type: ThorchainSaversDepositActionType.SET_IS_EXACT_ALLOWANCE,
          payload: !state.isExactAllowance,
        })
      }
    />
  )
}
