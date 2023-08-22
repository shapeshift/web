import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, ASSET_REFERENCE, fromAssetId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkBaseAdapter,
  CosmosSdkChainId,
  GetFeeDataInput,
} from '@shapeshiftoss/chain-adapters'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import type { Asset } from 'lib/asset-service'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type { OsmosisSupportedChainId } from 'lib/swapper/swappers/OsmosisSwapper/utils/types'
import { useFindByAssetIdQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import type { OsmosisPool } from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import {
  getPool,
  getPoolIdFromAssetReference,
} from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import { getUnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { OsmosisWithdrawActionType } from '../LpWithdrawCommon'
import { WithdrawContext } from '../LpWithdrawContext'

type AssetWithBaseUnitBalance = {
  cryptoAmountBaseUnit: string
  allocationPercentage?: string
  icons?: string[]
} & Asset

type OpportunityBalanceData = {
  underlyingAssetAmounts: AssetWithBaseUnitBalance[]
}

type ReceiveAmount = {
  cryptoAmountBaseUnit: string
  fiatAmount: string
}

type WithdrawProps = StepComponentProps & {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Withdraw: React.FC<WithdrawProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const { state, dispatch: contextDispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const [opportunityBalances, setOpportunityBalances] = useState<
    OpportunityBalanceData | undefined
  >(undefined)
  const [receiveAmounts, setReceiveAmounts] = useState<ReceiveAmount[] | undefined>([
    { cryptoAmountBaseUnit: '0', fiatAmount: '0' },
    { cryptoAmountBaseUnit: '0', fiatAmount: '0' },
  ])
  const [poolData, setPoolData] = useState<OsmosisPool | undefined>(undefined)

  const { chainId, assetReference } = query
  const osmosisOpportunity = state?.opportunity

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { setValue } = methods

  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectSelectedCurrencyMarketDataSortedByMarketCap)
  const lpAsset: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.assetId ?? ''),
  )

  const lpAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, {
      assetId: osmosisOpportunity?.assetId,
      accountId: accountId ?? '',
    }),
  )

  const underlyingAsset0 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[0] ?? ''),
  )
  const underlyingAsset1 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[1] ?? ''),
  )

  const { data: lpAssetData } = useFindByAssetIdQuery(lpAsset?.assetId || '')
  const lpAssetMarketData = lpAssetData?.[lpAsset?.assetId || '']

  const lpAssetFiatBalance = useMemo(
    () =>
      bnOrZero(lpAssetBalanceCryptoBaseUnit)
        .dividedBy(bn(10).pow(lpAsset?.precision ?? 18))
        .times(lpAssetMarketData?.price ?? 0)
        .toString(),
    [lpAsset?.precision, lpAssetBalanceCryptoBaseUnit, lpAssetMarketData?.price],
  )

  const { data: underlyingAsset0Data } = useFindByAssetIdQuery(underlyingAsset0?.assetId || '')
  const underlyingAsset0MarketData = underlyingAsset0Data?.[underlyingAsset0?.assetId || '']

  const { data: underlyingAsset1Data } = useFindByAssetIdQuery(underlyingAsset1?.assetId || '')
  const underlyingAsset1MarketData = underlyingAsset1Data?.[underlyingAsset1?.assetId || '']

  const toast = useToast()

  const getWithdrawFeeEstimateCryptoBaseUnit = useCallback(async (): Promise<
    string | undefined
  > => {
    if (!(assetReference && accountId && osmosisOpportunity)) return
    try {
      const chainAdapters = getChainAdapterManager()
      const adapter = chainAdapters.get(
        chainId,
      ) as unknown as CosmosSdkBaseAdapter<CosmosSdkChainId>
      const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {
        sendMax: false,
      }
      const fastFeeCryptoBaseUnit = (await adapter.getFeeData(getFeeDataInput)).fast.txFee

      return fastFeeCryptoBaseUnit
    } catch (error) {
      console.error(error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    }
  }, [assetReference, accountId, osmosisOpportunity, chainId, toast, translate])

  const calculateUnderlyingTokenAmounts = useCallback(
    async (lpAsset: Asset, amountBaseUnit: string): Promise<OpportunityBalanceData | undefined> => {
      if (!(osmosisOpportunity && underlyingAsset0 && underlyingAsset1)) return undefined

      const id = getPoolIdFromAssetReference(fromAssetId(lpAsset.assetId).assetReference)
      if (!id) return undefined
      if (!poolData) setPoolData(await getPool(id))

      if (
        !(
          poolData &&
          poolData.pool_assets &&
          poolData.total_shares &&
          poolData.total_weight !== '0'
        )
      ) {
        return undefined
      }

      const poolOwnershipFraction = bnOrZero(amountBaseUnit)
        .dividedBy(bnOrZero(poolData.total_shares.amount))
        .toString()

      const underlyingAsset0AllocationPercentage = bnOrZero(poolData.pool_assets[0].weight)
        .dividedBy(bnOrZero(poolData.total_weight))
        .toString()
      const underlyingAsset1AllocationPercentage = bnOrZero(poolData.pool_assets[1].weight)
        .dividedBy(bnOrZero(poolData.total_weight))
        .toString()

      const underlyingAsset0Balance = bnOrZero(poolOwnershipFraction)
        .multipliedBy(poolData.pool_assets[0].token.amount)
        .toString()
      const underlyingAsset1Balance = bnOrZero(poolOwnershipFraction)
        .multipliedBy(poolData.pool_assets[1].token.amount)
        .toString()

      return {
        underlyingAssetAmounts: [
          {
            ...underlyingAsset0,
            allocationPercentage: underlyingAsset0AllocationPercentage,
            cryptoAmountBaseUnit: underlyingAsset0Balance,
          },
          {
            ...underlyingAsset1,
            allocationPercentage: underlyingAsset1AllocationPercentage,
            cryptoAmountBaseUnit: underlyingAsset1Balance,
          },
        ],
      }
    },
    [osmosisOpportunity, poolData, underlyingAsset0, underlyingAsset1],
  )

  const calculateTokenOutMins = useCallback(
    async (
      inputPoolSharesBaseUnit: string,
    ): Promise<{ amount: string; denom: string }[] | undefined> => {
      if (
        !(osmosisOpportunity && state && state.opportunity && underlyingAsset0 && underlyingAsset1)
      ) {
        return undefined
      }

      const { assetReference: poolAssetReference } = fromAssetId(state.opportunity.assetId)
      const id = getPoolIdFromAssetReference(poolAssetReference)
      if (!id) return undefined

      if (!poolData) setPoolData(await getPool(id))

      if (
        !(
          poolData &&
          poolData.pool_assets &&
          poolData.total_shares &&
          poolData.total_weight !== '0'
        )
      ) {
        return undefined
      }

      /**
       * pool_share_fraction = input_pool_shares / total_pool_shares
       * This represents the fraction of the total number of pool LP tokens being redeemed
       */
      if (bnOrZero(poolData.total_shares.amount).eq(bn(0))) return undefined
      const poolShareFraction = bnOrZero(inputPoolSharesBaseUnit)
        .dividedBy(poolData.total_shares.amount)
        .toString()

      /**
       * token_out_n_amount = token_n_amount * pool_share_fraction * asset_n_proportional_weight
       * This represents the number of each underlying token being returned to the user
       */
      const tokenOut0AmountBaseUnit = bnOrZero(poolData.pool_assets[0].token.amount)
        .multipliedBy(poolShareFraction)
        .toFixed(0, BigNumber.ROUND_DOWN)

      const tokenOut1AmountBaseUnit = bnOrZero(poolData.pool_assets[1].token.amount)
        .multipliedBy(poolShareFraction)
        .toFixed(0, BigNumber.ROUND_DOWN)

      const asset0Reference = fromAssetId(underlyingAsset0.assetId).assetReference
      const asset1Reference = fromAssetId(underlyingAsset1.assetId).assetReference

      return [
        {
          amount: tokenOut0AmountBaseUnit,
          denom:
            asset0Reference === ASSET_REFERENCE.Osmosis
              ? 'uosmo'
              : `${ASSET_NAMESPACE.ibc}/${asset0Reference}`,
        },
        {
          amount: tokenOut1AmountBaseUnit,
          denom:
            asset1Reference === ASSET_REFERENCE.Osmosis
              ? 'uosmo'
              : `${ASSET_NAMESPACE.ibc}/${asset1Reference}`,
        },
      ]
    },
    [osmosisOpportunity, poolData, state, underlyingAsset0, underlyingAsset1],
  )

  const handleInputChange = (value: string, isFiat?: boolean) => {
    if (!(lpAsset && lpAssetMarketData?.price && underlyingAsset0 && underlyingAsset1)) return

    const _value = isFiat ? bnOrZero(value).div(lpAssetMarketData.price).toString() : value
    const fiatValue = isFiat
      ? value
      : bnOrZero(value).multipliedBy(lpAssetMarketData.price).toString()
    ;(async () => {
      const receiveAmounts = await calculateUnderlyingTokenAmounts(
        lpAsset,
        bn(_value).multipliedBy(bn(10).pow(lpAsset.precision)).toFixed(0, BigNumber.ROUND_DOWN),
      )
      if (!receiveAmounts) return
      const receiveAmountsCryptoPrecision = [
        {
          cryptoAmountBaseUnit: receiveAmounts.underlyingAssetAmounts[0].cryptoAmountBaseUnit,
          fiatAmount: bnOrZero(fiatValue)
            .multipliedBy(bnOrZero(receiveAmounts.underlyingAssetAmounts[0].allocationPercentage))
            .toString(),
        },

        {
          cryptoAmountBaseUnit: receiveAmounts.underlyingAssetAmounts[1].cryptoAmountBaseUnit,
          fiatAmount: bnOrZero(fiatValue)
            .multipliedBy(bnOrZero(receiveAmounts.underlyingAssetAmounts[0].allocationPercentage))
            .toString(),
        },
      ]
      setReceiveAmounts(receiveAmountsCryptoPrecision)
    })()
  }

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (
        !(
          state &&
          contextDispatch &&
          osmosisOpportunity &&
          underlyingAsset0 &&
          underlyingAsset1 &&
          lpAsset &&
          receiveAmounts
        )
      )
        return

      const tokenOutMinsCryptoBaseUnit = await calculateTokenOutMins(
        bnOrZero(formValues.cryptoAmount).multipliedBy(bn(10).pow(lpAsset.precision)).toString(),
      )
      if (!tokenOutMinsCryptoBaseUnit) return
      const shareInAmountBaseUnit = bnOrZero(formValues.cryptoAmount)
        .multipliedBy(bn(10).pow(lpAsset.precision))
        .toFixed(0, BigNumber.ROUND_DOWN)
        .toString()
      // set withdraw state for future use
      contextDispatch({
        type: OsmosisWithdrawActionType.SET_WITHDRAW,
        payload: {
          underlyingAsset0: tokenOutMinsCryptoBaseUnit[0],
          underlyingAsset1: tokenOutMinsCryptoBaseUnit[1],
          shareInAmountBaseUnit,
        },
      })
      contextDispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: true })
      try {
        const estimatedFeeCryptoBaseUnit = await getWithdrawFeeEstimateCryptoBaseUnit()
        if (!estimatedFeeCryptoBaseUnit) return
        contextDispatch({
          type: OsmosisWithdrawActionType.SET_WITHDRAW,
          payload: { estimatedFeeCryptoBaseUnit },
        })
        onNext(DefiStep.Confirm)
        contextDispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: false })
        // We don't track the other values in formValues so need to calculate it
        const underlyingAssetBalances = getUnderlyingAssetIdsBalances({
          assetId: osmosisOpportunity.assetId,
          underlyingAssetIds: osmosisOpportunity.underlyingAssetIds,
          underlyingAssetRatiosBaseUnit: osmosisOpportunity.underlyingAssetRatiosBaseUnit,
          cryptoAmountBaseUnit: shareInAmountBaseUnit,
          assets,
          marketData,
        })
        trackOpportunityEvent(
          MixPanelEvents.WithdrawContinue,
          {
            opportunity: osmosisOpportunity,
            fiatAmounts: [
              underlyingAssetBalances[underlyingAsset0.assetId].fiatAmount,
              underlyingAssetBalances[underlyingAsset1.assetId].fiatAmount,
            ],
            cryptoAmounts: [
              { assetId: lpAsset.assetId, amountCryptoHuman: formValues.cryptoAmount },
              {
                assetId: underlyingAsset0.assetId,
                amountCryptoHuman:
                  underlyingAssetBalances[underlyingAsset0.assetId].cryptoBalancePrecision,
              },
              {
                assetId: underlyingAsset1.assetId,
                amountCryptoHuman:
                  underlyingAssetBalances[underlyingAsset1.assetId].cryptoBalancePrecision,
              },
            ],
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
        contextDispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: false })
      }
    },
    [
      state,
      contextDispatch,
      osmosisOpportunity,
      underlyingAsset0,
      underlyingAsset1,
      lpAsset,
      receiveAmounts,
      calculateTokenOutMins,
      getWithdrawFeeEstimateCryptoBaseUnit,
      onNext,
      assets,
      marketData,
      toast,
      translate,
    ],
  )

  const handleCancel = browserHistory.goBack

  const handlePercentClick = (percent: number) => {
    if (!lpAssetMarketData || !lpAsset) return
    const cryptoAmountBaseUnit = bnOrZero(lpAssetBalanceCryptoBaseUnit)
      .multipliedBy(percent)
      .toString()
    const cryptoAmountPrecision = bnOrZero(cryptoAmountBaseUnit)
      .dividedBy(bn(10).pow(lpAsset.precision))
      .toString()
    const fiatAmount = bnOrZero(lpAssetBalanceCryptoBaseUnit)
      .dividedBy(bn(10).pow(lpAsset.precision))
      .times(lpAssetMarketData.price)
      .multipliedBy(percent)
      .toString()

    setValue(Field.FiatAmount, fiatAmount, { shouldValidate: true })
    setValue(Field.CryptoAmount, cryptoAmountPrecision, { shouldValidate: true })
    handleInputChange(cryptoAmountPrecision, false)
  }

  useEffect(() => {
    // Calculate underlying token balances
    if (!lpAsset) return
    ;(async () => {
      const balances = await calculateUnderlyingTokenAmounts(lpAsset, lpAssetBalanceCryptoBaseUnit)
      if (!balances) return
      setOpportunityBalances(balances)
    })()
  }, [calculateUnderlyingTokenAmounts, lpAsset, lpAssetBalanceCryptoBaseUnit, poolData, state])

  if (
    !(
      lpAsset &&
      state &&
      osmosisOpportunity &&
      opportunityBalances &&
      receiveAmounts &&
      underlyingAsset0 &&
      underlyingAsset1 &&
      lpAssetMarketData &&
      underlyingAsset0MarketData &&
      underlyingAsset1MarketData &&
      osmosisOpportunity?.icons
    )
  ) {
    return null
  }

  const validateCryptoAmount = (value: string) => {
    const lpAssetBalanceCryptoPrecision = bnOrZero(lpAssetBalanceCryptoBaseUnit).div(
      bn(10).pow(lpAsset.precision),
    )
    const _value = bnOrZero(value)
    const hasValidBalance =
      bnOrZero(lpAssetBalanceCryptoBaseUnit).gt(0) &&
      _value.gt(0) &&
      lpAssetBalanceCryptoPrecision.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const _value = bnOrZero(value)
    const hasValidBalance =
      bnOrZero(lpAssetFiatBalance).gt(0) && _value.gt(0) && bnOrZero(lpAssetFiatBalance).gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  if (!lpAsset || !lpAssetMarketData) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        asset={lpAsset}
        icons={osmosisOpportunity?.icons}
        cryptoAmountAvailable={bnOrZero(lpAssetBalanceCryptoBaseUnit)
          .dividedBy(bn(10).pow(lpAsset.precision ?? '0'))
          .toFixed()}
        cryptoInputValidation={{
          required: true,
          validate: { validateCryptoAmount },
        }}
        fiatAmountAvailable={lpAssetFiatBalance.toString()}
        fiatInputValidation={{
          required: true,
          validate: { validateFiatAmount },
        }}
        marketData={lpAssetMarketData}
        onAccountIdChange={handleAccountIdChange}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading || !osmosisOpportunity}
        percentOptions={[0.25, 0.5, 0.75, 1]}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
        onInputChange={handleInputChange}
      >
        <>
          <Text translation='common.receive' />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmount={
              bnOrZero(receiveAmounts?.[0]?.cryptoAmountBaseUnit).gt(0)
                ? bnOrZero(receiveAmounts?.[0]?.cryptoAmountBaseUnit)
                    .div(bn(10).pow(underlyingAsset0.precision ?? '0'))
                    .toFixed(underlyingAsset0.precision, BigNumber.ROUND_DOWN)
                : '0'
            }
            fiatAmount={bnOrZero(receiveAmounts?.[0]?.fiatAmount).toFixed(2) ?? '0'}
            showFiatAmount={true}
            assetId={underlyingAsset0.assetId}
            assetIcon={underlyingAsset0.icon}
            assetSymbol={underlyingAsset0.symbol}
            balance={bnOrZero(opportunityBalances.underlyingAssetAmounts[0].cryptoAmountBaseUnit)
              .div(bn(10).pow(underlyingAsset0.precision ?? '0'))
              .toFixed()}
            fiatBalance={bnOrZero(
              fromBaseUnit(
                opportunityBalances.underlyingAssetAmounts[0].cryptoAmountBaseUnit,
                underlyingAsset0?.precision,
              ),
            )
              .multipliedBy(underlyingAsset0MarketData?.price)
              .toFixed(2)}
            percentOptions={[]}
            isReadOnly={true}
          />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmount={
              bnOrZero(receiveAmounts?.[1]?.cryptoAmountBaseUnit).gt(0)
                ? bnOrZero(receiveAmounts?.[1]?.cryptoAmountBaseUnit)
                    .div(bn(10).pow(underlyingAsset1.precision ?? '0'))
                    .toFixed(underlyingAsset1.precision, BigNumber.ROUND_DOWN)
                : '0'
            }
            fiatAmount={bnOrZero(receiveAmounts?.[1]?.fiatAmount).toFixed(2) ?? '0'}
            showFiatAmount={true}
            assetId={underlyingAsset1.assetId}
            assetIcon={underlyingAsset1.icon}
            assetSymbol={underlyingAsset1.symbol}
            balance={bnOrZero(opportunityBalances.underlyingAssetAmounts[1].cryptoAmountBaseUnit)
              .div(bn(10).pow(underlyingAsset1.precision ?? '0'))
              .toFixed()}
            fiatBalance={bnOrZero(
              fromBaseUnit(
                opportunityBalances.underlyingAssetAmounts[1].cryptoAmountBaseUnit,
                underlyingAsset1?.precision,
              ),
            )
              .multipliedBy(underlyingAsset1MarketData?.price)
              .toFixed(2)}
            percentOptions={[]}
            isReadOnly={true}
          />
        </>
      </ReusableWithdraw>
    </FormProvider>
  )
}
