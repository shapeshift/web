import { useToast } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import type { DepositValues } from 'features/defi/components/Deposit/PairDeposit'
import { PairDepositWithAllocation } from 'features/defi/components/Deposit/PairDepositWithAllocation'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { useFindByAssetIdQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssetById, selectPortfolioCryptoBalanceByFilter } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { OsmosisDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Osmosis', 'Deposit', 'Deposit'],
})

type DepositProps = StepComponentProps & {
  accountId?: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
} & StepComponentProps

export const Deposit: React.FC<DepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const { state, dispatch: contextDispatch } = useContext(DepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const opportunity = state?.opportunity

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId))

  const underlyingAsset0Id = opportunity?.underlyingAssetIds[0] || ''
  const underlyingAsset1Id = opportunity?.underlyingAssetIds[1] || ''
  const underlyingAsset0 = useAppSelector(state => selectAssetById(state, underlyingAsset0Id))
  const underlyingAsset1 = useAppSelector(state => selectAssetById(state, underlyingAsset1Id))

  const underlyingAsset0Balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, {
      assetId: opportunity?.underlyingAssetIds[0],
      accountId: accountId ?? '',
    }),
  )
  const underlyingAsset1Balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, {
      assetId: opportunity?.underlyingAssetIds[1],
      accountId: accountId ?? '',
    }),
  )

  const { data: underlyingAsset0Data } = useFindByAssetIdQuery(underlyingAsset0?.assetId || '')
  const underlyingAsset0MarketData = underlyingAsset0Data?.[underlyingAsset0?.assetId || '']

  const { data: underlyingAsset1Data } = useFindByAssetIdQuery(underlyingAsset1?.assetId || '')
  const underlyingAsset1MarketData = underlyingAsset1Data?.[underlyingAsset1?.assetId || '']

  const userAddress = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])
  const toast = useToast()

  const getDepositFeeEstimate = useCallback(async (): Promise<string | undefined> => {
    if (!(contextDispatch && userAddress && assetReference && accountId && opportunity)) return
    try {
      const chainAdapters = getChainAdapterManager()
      const adapter = chainAdapters.get(
        chainId,
      ) as unknown as CosmosSdkBaseAdapter<CosmosSdkChainId>
      const fastFeeCryptoBaseUnit = (
        await adapter.getFeeData({
          sendMax: false,
        })
      ).fast.txFee

      const fastFeeCryptoPrecision = bnOrZero(
        bn(fastFeeCryptoBaseUnit).div(bn(10).pow(asset?.precision ?? 0)),
      )
      return bnOrZero(fastFeeCryptoPrecision).toString()
    } catch (error) {
      moduleLogger.error(
        { fn: 'getDepositFeeEstimate', error },
        'Error getting deposit fee estimate',
      )
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    } finally {
      contextDispatch({ type: OsmosisDepositActionType.SET_LOADING, payload: false })
    }
  }, [
    contextDispatch,
    userAddress,
    assetReference,
    accountId,
    opportunity,
    asset,
    chainId,
    toast,
    translate,
  ])

  /** Returns an array containing the allocation fraction and shareOutAmount,
   * calculated from the form input parameters */
  /** Share out amount is the exact number of tokens expected to be received. See documentation below:
   * https://docs.osmosis.zone/osmosis-core/modules/gamm/#join-pool
   * https://github.com/osmosis-labs/osmosis-frontend/blob/d3badcee48f54e61e6a6117c294c0725822a4100/packages/stores/src/ui-config/manage-liquidity/add-liquidity.ts#L371
   * NOTE: This calculation may need to be modified to support pools with unequal weights at a later date. The Osmosis frontend does not currently do this.
   */
  const calculateAllocations = useCallback(
    (
      inputAsset: Asset,
      inputAssetAmount: string,
    ): { allocationFraction: string; shareOutAmount: string } => {
      const ret = { allocationFraction: '0', shareOutAmount: '0' }
      if (!state || !state.poolData) {
        return ret
      }
      const poolAssets = state?.poolData?.pool_assets

      let { assetReference: inputAssetReference } = fromAssetId(inputAsset.assetId)
      if (inputAssetReference === ASSET_REFERENCE.Osmosis) inputAssetReference = 'uosmo'

      if (!poolAssets) return ret
      const poolAssetIndex = poolAssets.findIndex(asset =>
        asset.token.denom.toLowerCase().includes(inputAssetReference.toLowerCase()),
      )
      if (poolAssetIndex < 0) return ret

      const inputAssetAmountBaseUnits = bnOrZero(inputAssetAmount)
        .pow(10, bnOrZero(inputAsset.precision))
        .toString()

      const poolTotalSharesBaseUnits = state?.poolData?.total_shares?.amount
      if (!poolTotalSharesBaseUnits) {
        moduleLogger.error(`Could not get total shares for pool ${state?.poolData?.id}`)
        return ret
      }

      const poolAssetAmountBaseUnits = poolAssets[poolAssetIndex]?.token.amount

      if (bnOrZero(poolAssetAmountBaseUnits).eq(bn(0))) return ret

      /** allocation_fraction = input_asset_amount / (pool_asset_amount + pool_asset_amount)
       * This represents the fraction of the pool that the user will own after once the liquiditt
       * has been provided
       */
      const allocationFraction = bnOrZero(inputAssetAmountBaseUnits)
        .div(bnOrZero(poolAssetAmountBaseUnits).plus(inputAssetAmountBaseUnits))
        .toString()

      /** share_out_amount = total_pool_shares * (input_asset_amount / pool_asset_amount)
       * This represents the number of pool shares that the user will receive in exchange
       * for the provided liquidity
       */
      const shareOutAmountBaseUnits = bnOrZero(poolTotalSharesBaseUnits)
        .multipliedBy(
          bnOrZero(inputAssetAmountBaseUnits).dividedBy(bnOrZero(poolAssetAmountBaseUnits)),
        )
        .toFixed(0)
        .toString()

      ret.allocationFraction = allocationFraction
      ret.shareOutAmount = shareOutAmountBaseUnits
      return ret
    },
    [state],
  )

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (
        !(
          state &&
          contextDispatch &&
          userAddress &&
          opportunity &&
          underlyingAsset0 &&
          underlyingAsset1
        )
      )
        return

      const asset0AmountBaseUnits = bnOrZero(formValues.cryptoAmount1)
        .pow(10, bnOrZero(underlyingAsset0.precision))
        .toString()

      const asset1AmountBaseUnits = bnOrZero(formValues.cryptoAmount2)
        .pow(10, bnOrZero(underlyingAsset1.precision))
        .toString()

      // set deposit state for future use
      contextDispatch({
        type: OsmosisDepositActionType.SET_DEPOSIT,
        payload: {
          underlyingAsset0: {
            amount: asset0AmountBaseUnits,
            denom: fromAssetId(underlyingAsset0.assetId).assetReference,
          },
          underlyingAsset1: {
            amount: asset1AmountBaseUnits,
            denom: fromAssetId(underlyingAsset1.assetId).assetReference,
          },
          shareOutAmount: calculateAllocations(underlyingAsset0, formValues.cryptoAmount1)
            .shareOutAmount,
        },
      })
      contextDispatch({ type: OsmosisDepositActionType.SET_LOADING, payload: true })
      try {
        const estimatedFeeCrypto = await getDepositFeeEstimate()
        if (!estimatedFeeCrypto) return
        contextDispatch({
          type: OsmosisDepositActionType.SET_DEPOSIT,
          payload: { estimatedFeeCrypto },
        })
        onNext(DefiStep.Confirm)
        contextDispatch({ type: OsmosisDepositActionType.SET_LOADING, payload: false })
      } catch (error) {
        moduleLogger.error({ fn: 'handleContinue', error }, 'Error on continue')
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
        contextDispatch({ type: OsmosisDepositActionType.SET_LOADING, payload: false })
      }
    },
    [
      state,
      contextDispatch,
      userAddress,
      opportunity,
      underlyingAsset0,
      underlyingAsset1,
      calculateAllocations,
      getDepositFeeEstimate,
      onNext,
      toast,
      translate,
    ],
  )

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const handleBack = useCallback(() => {
    history.push({
      pathname: `/defi/earn`,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [history, query])

  if (
    !(
      asset &&
      state &&
      contextDispatch &&
      opportunity &&
      underlyingAsset0 &&
      underlyingAsset1 &&
      underlyingAsset0MarketData &&
      underlyingAsset1MarketData
    )
  ) {
    return null
  }

  const validateCryptoAmount = (value: string, isForAsset1: boolean) => {
    const crypto = bnOrZero(isForAsset1 ? underlyingAsset1Balance : underlyingAsset0Balance).div(
      `1e+${(isForAsset1 ? underlyingAsset1 : underlyingAsset0).precision}`,
    )
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string, isForAsset1: boolean) => {
    const crypto = bnOrZero(isForAsset1 ? underlyingAsset1Balance : underlyingAsset0Balance).div(
      `1e+${(isForAsset1 ? underlyingAsset1 : underlyingAsset0).precision}`,
    )
    const fiat = crypto.times(
      (isForAsset1 ? underlyingAsset1MarketData : underlyingAsset0MarketData).price,
    )
    const _value = bnOrZero(value)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const underlyingAsset0CryptoAmountAvailable = bnOrZero(underlyingAsset0Balance).div(
    bn(10).pow(underlyingAsset0.precision),
  )
  const underlyingAsset0FiatAmountAvailable = bnOrZero(underlyingAsset0CryptoAmountAvailable).times(
    underlyingAsset0MarketData.price,
  )
  const underlyingAsset1CryptoAmountAvailable = bnOrZero(underlyingAsset1Balance).div(
    bn(10).pow(underlyingAsset1.precision),
  )
  const underlyingAsset1FiatAmountAvailable = bnOrZero(underlyingAsset1CryptoAmountAvailable).times(
    underlyingAsset1MarketData.price,
  )

  return (
    <PairDepositWithAllocation
      accountId={accountId}
      asset1={underlyingAsset0}
      asset2={underlyingAsset1}
      icons={opportunity?.icons}
      destAsset={asset}
      apy={opportunity?.apy?.toString() ?? ''}
      calculateAllocations={calculateAllocations}
      cryptoAmountAvailable1={underlyingAsset0CryptoAmountAvailable.toPrecision()}
      cryptoAmountAvailable2={underlyingAsset1CryptoAmountAvailable.toPrecision()}
      cryptoInputValidation1={{
        required: true,
        validate: { validateCryptoAmount1: (val: string) => validateCryptoAmount(val, true) },
      }}
      cryptoInputValidation2={{
        required: true,
        validate: { validateCryptoAmount2: (val: string) => validateCryptoAmount(val, false) },
      }}
      fiatAmountAvailable1={underlyingAsset0FiatAmountAvailable.toFixed(2)}
      fiatAmountAvailable2={underlyingAsset1FiatAmountAvailable.toFixed(2)}
      fiatInputValidation1={{
        required: true,
        validate: { validateFiatAmount1: (val: string) => validateFiatAmount(val, true) },
      }}
      fiatInputValidation2={{
        required: true,
        validate: { validateFiatAmount2: (val: string) => validateFiatAmount(val, false) },
      }}
      marketData1={underlyingAsset0MarketData}
      marketData2={underlyingAsset1MarketData}
      onCancel={handleCancel}
      onAccountIdChange={handleAccountIdChange}
      onContinue={handleContinue}
      onBack={handleBack}
      percentOptions={[0.25, 0.5, 0.75, 1]}
      enableSlippage={false}
      isLoading={state.loading}
    />
  )
}
