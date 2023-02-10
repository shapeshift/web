import { useToast } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  fromAccountId,
  fromAssetId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import type { DepositValues } from 'features/defi/components/Deposit/PairDeposit'
import { PairDepositWithAllocation } from 'features/defi/components/Deposit/PairDepositWithAllocation'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { useFindByAssetIdQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import type { OsmosisPool } from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import {
  getPool,
  getPoolIdFromAssetReference,
} from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import { selectAssetById, selectPortfolioCryptoBalanceByFilter } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { OsmosisDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const DEFAULT_SLIPPAGE = '0.001' // Allow for 0.1% slippage. TODO(pastaghost): is there a better way to do this?

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
  const [poolData, setPoolData] = useState<OsmosisPool | undefined>(undefined)
  const { chainId, assetNamespace, assetReference } = query
  const osmosisOpportunity = state?.opportunity

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const underlyingAsset0 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[0] ?? ''),
  )
  const underlyingAsset1 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[1] ?? ''),
  )

  const underlyingAsset0Balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, {
      assetId: osmosisOpportunity?.underlyingAssetIds[0],
      accountId: accountId ?? '',
    }),
  )
  const underlyingAsset1Balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, {
      assetId: osmosisOpportunity?.underlyingAssetIds[1],
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
    if (!(contextDispatch && userAddress && assetReference && accountId && osmosisOpportunity))
      return
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

      return bnOrZero(fastFeeCryptoBaseUnit).toString()
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
    osmosisOpportunity,
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
      inputAssetAmountPrecision: string,
    ): { allocationFraction: string; shareOutAmountBaseUnit: string } | undefined => {
      if (!(state && state.opportunity?.assetId)) {
        return undefined
      }

      if (!poolData) return undefined

      const poolTotalSharesBaseUnit = poolData.total_shares?.amount
      if (!poolTotalSharesBaseUnit) {
        moduleLogger.error(`Could not get total shares for pool ${poolData.id}`)
        return undefined
      }

      const poolAssets = poolData.pool_assets

      let { assetReference: inputAssetReference } = fromAssetId(inputAsset.assetId)
      if (inputAssetReference === ASSET_REFERENCE.Osmosis) inputAssetReference = 'uosmo'

      if (!poolAssets) return undefined
      const poolAssetIndex = poolAssets.findIndex(asset =>
        asset.token.denom.toLowerCase().includes(inputAssetReference.toLowerCase()),
      )
      if (poolAssetIndex < 0) return undefined

      const inputAssetAmountBaseUnit = bnOrZero(inputAssetAmountPrecision)
        .multipliedBy(bn(10).pow(bnOrZero(inputAsset.precision)))
        .toString()

      const poolAssetAmountBaseUnit = poolAssets[poolAssetIndex]?.token.amount

      if (bnOrZero(poolAssetAmountBaseUnit).eq(bn(0))) return undefined

      /** allocation_fraction = input_asset_amount / (pool_asset_amount + pool_asset_amount)
       * This represents the fraction of the pool that the user will own after once the liquiditt
       * has been provided
       */
      const allocationFraction = bnOrZero(inputAssetAmountBaseUnit)
        .div(bnOrZero(poolAssetAmountBaseUnit).plus(inputAssetAmountBaseUnit))
        .toString()

      /** share_out_amount = total_pool_shares * (input_asset_amount / pool_asset_amount)
       * This represents the number of pool shares that the user will receive in exchange
       * for the provided liquidity
       */
      const shareOutAmountBaseUnit = bnOrZero(poolTotalSharesBaseUnit)
        .multipliedBy(
          bnOrZero(inputAssetAmountBaseUnit).dividedBy(bnOrZero(poolAssetAmountBaseUnit)),
        )
        .multipliedBy(bn(1).minus(bnOrZero(DEFAULT_SLIPPAGE)))
        .toFixed(0, BigNumber.ROUND_DOWN)
        .toString()

      return { allocationFraction, shareOutAmountBaseUnit }
    },
    [poolData, state],
  )

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (!(state && contextDispatch && osmosisOpportunity && underlyingAsset0 && underlyingAsset1))
        return

      const allocations = await calculateAllocations(underlyingAsset0, formValues.cryptoAmount1)
      if (!allocations) return

      const asset0AmountBaseUnit = bnOrZero(formValues.cryptoAmount1)
        .multipliedBy(bn(10).pow(bnOrZero(underlyingAsset0.precision)))
        .toString()

      const asset1AmountBaseUnit = bnOrZero(formValues.cryptoAmount2)
        .multipliedBy(bn(10).pow(bnOrZero(underlyingAsset1.precision)))
        .toString()

      const asset0Reference = fromAssetId(underlyingAsset0.assetId).assetReference
      const asset1Reference = fromAssetId(underlyingAsset1.assetId).assetReference

      // set deposit state for future use
      contextDispatch({
        type: OsmosisDepositActionType.SET_DEPOSIT,
        payload: {
          underlyingAsset0: {
            amount: asset0AmountBaseUnit,
            denom:
              asset0Reference === ASSET_REFERENCE.Osmosis
                ? 'uosmo'
                : `${ASSET_NAMESPACE.ibc}/${asset0Reference}`,
          },
          underlyingAsset1: {
            amount: asset1AmountBaseUnit,
            denom:
              asset1Reference === ASSET_REFERENCE.Osmosis
                ? 'uosmo'
                : `${ASSET_NAMESPACE.ibc}/${asset1Reference}`,
          },
          shareOutAmountBaseUnit: allocations.shareOutAmountBaseUnit,
        },
      })
      contextDispatch({ type: OsmosisDepositActionType.SET_LOADING, payload: true })
      try {
        const estimatedFeeCryptoBaseUnit = await getDepositFeeEstimate()
        if (!estimatedFeeCryptoBaseUnit) return
        contextDispatch({
          type: OsmosisDepositActionType.SET_DEPOSIT,
          payload: { estimatedFeeCryptoBaseUnit },
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
      osmosisOpportunity,
      underlyingAsset0,
      underlyingAsset1,
      calculateAllocations,
      getDepositFeeEstimate,
      onNext,
      toast,
      translate,
    ],
  )

  useEffect(() => {
    // Fetch pool data
    ;(async () => {
      if (!(state && state.opportunity)) return undefined

      const { assetReference: poolAssetReference } = fromAssetId(state.opportunity.assetId)
      const id = getPoolIdFromAssetReference(poolAssetReference)
      if (!id) return undefined

      if (!poolData) setPoolData(await getPool(id))
    })()
  }, [poolData, state])

  const handleCancel = browserHistory.goBack

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
      assetId &&
      state &&
      contextDispatch &&
      osmosisOpportunity &&
      underlyingAsset0 &&
      underlyingAsset1 &&
      underlyingAsset0MarketData &&
      underlyingAsset1MarketData
    )
  ) {
    return null
  }

  const validateCryptoAmount = (value: string, isForAsset1: boolean) => {
    const crypto = bnOrZero(
      isForAsset1 ? underlyingAsset0Balance : underlyingAsset1Balance,
    ).dividedBy(bn(10).pow((isForAsset1 ? underlyingAsset0 : underlyingAsset1).precision ?? '0'))
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string, isForAsset1: boolean) => {
    const crypto = bnOrZero(isForAsset1 ? underlyingAsset0Balance : underlyingAsset1Balance).div(
      bn(10).pow((isForAsset1 ? underlyingAsset0 : underlyingAsset1).precision),
    )
    const fiat = crypto.times(
      (isForAsset1 ? underlyingAsset0MarketData : underlyingAsset1MarketData).price,
    )
    const _value = bnOrZero(value)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  return (
    <PairDepositWithAllocation
      accountId={accountId}
      opportunity={osmosisOpportunity}
      destAssetId={assetId}
      calculateAllocations={calculateAllocations}
      cryptoInputValidation1={{
        required: true,
        validate: { validateCryptoAmount1: (val: string) => validateCryptoAmount(val, true) },
      }}
      cryptoInputValidation2={{
        required: true,
        validate: { validateCryptoAmount2: (val: string) => validateCryptoAmount(val, false) },
      }}
      fiatInputValidation1={{
        required: true,
        validate: { validateFiatAmount1: (val: string) => validateFiatAmount(val, true) },
      }}
      fiatInputValidation2={{
        required: true,
        validate: { validateFiatAmount2: (val: string) => validateFiatAmount(val, false) },
      }}
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
