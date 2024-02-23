import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
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
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { encodeFunctionData, getAddress } from 'viem'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { useRouterContractAddress } from 'lib/swapper/swappers/ThorchainSwapper/utils/useRouterContractAddress'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/utils/constants'
import { isSome, isToken } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
  getErc20Allowance,
} from 'lib/utils/evm'
import { getInboundAddressDataForChain } from 'lib/utils/thorchain/getInboundAddressDataForChain'
import { getMaybeThorchainSaversDepositQuote } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFeeAssetById,
  selectFungibleAssets,
  selectMarketDataByAssetIdUserCurrency,
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
  const { showErrorToast } = useErrorHandler()
  const {
    state: { wallet },
  } = useWallet()

  const accountNumberFilter = useMemo(() => ({ accountId }), [accountId])
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const assets = useAppSelector(selectFungibleAssets)
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
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const { routerContractAddress: saversRouterContractAddress } = useRouterContractAddress({
    feeAssetId: feeAsset?.assetId ?? '',
    skip: !isTokenDeposit || !feeAsset?.assetId,
    excludeHalted: true,
  })

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

      const amountCryptoBaseUnit = toBaseUnit(state.deposit.cryptoAmount, asset.precision)

      const poolId = assetIdToPoolAssetId({ assetId: asset.assetId })

      if (!poolId) throw new Error(`poolId not found for assetId ${asset.assetId}`)

      const contract = getOrCreateContractByType({
        address: fromAssetId(assetId).assetReference,
        type: ContractType.ERC20,
        chainId,
      })

      const amountToApprove = state.isExactAllowance ? amountCryptoBaseUnit : MAX_ALLOWANCE

      const data = encodeFunctionData({
        abi: contract.abi,
        functionName: 'approve',
        args: [getAddress(saversRouterContractAddress), BigInt(amountToApprove)],
      })

      const adapter = assertGetEvmChainAdapter(chainId)
      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber,
        adapter,
        data,
        value: '0',
        to: fromAssetId(assetId).assetReference,
        wallet,
      })

      await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
      })
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

        const data = encodeFunctionData({
          abi: thorContract.abi,
          functionName: 'depositWithExpiry',
          args: [
            getAddress(quote.inbound_address),
            getAddress(fromAssetId(assetId).assetReference),
            BigInt(amountCryptoBaseUnit),
            quote.memo,
            BigInt(quote.expiry),
          ],
        })

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
      })()

      dispatch({
        type: ThorchainSaversDepositActionType.SET_DEPOSIT,
        payload: { estimatedGasCryptoPrecision: estimatedDepositGasCryptoPrecision },
      })

      trackOpportunityEvent(
        MixPanelEvent.DepositApprove,
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
      showErrorToast(error)
      dispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
    }
  }, [
    accountId,
    accountNumber,
    asset,
    assetId,
    assets,
    chainId,
    dispatch,
    feeAsset?.assetId,
    feeAsset.precision,
    onNext,
    opportunityData,
    poll,
    saversRouterContractAddress,
    showErrorToast,
    state?.deposit.cryptoAmount,
    state?.deposit.fiatAmount,
    state?.isExactAllowance,
    wallet,
  ])

  const onExactAllowanceToggle = useCallback(() => {
    if (!dispatch) return

    dispatch({
      type: ThorchainSaversDepositActionType.SET_IS_EXACT_ALLOWANCE,
      payload: !state?.isExactAllowance,
    })
  }, [dispatch, state?.isExactAllowance])

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

  const handleCancel = useCallback(() => history.push('/'), [history])

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
      onCancel={handleCancel}
      onConfirm={handleApprove}
      spenderContractAddress={saversRouterContractAddress}
      onToggle={onExactAllowanceToggle}
    />
  )
}
