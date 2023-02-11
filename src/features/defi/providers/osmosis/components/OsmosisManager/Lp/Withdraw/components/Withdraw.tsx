import { useToast } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, ASSET_REFERENCE, fromAssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit } from 'lib/math'
import { useFindByAssetIdQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import type { OsmosisPool } from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import {
  getPool,
  getPoolIdFromAssetReference,
} from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import { selectAssetById, selectPortfolioCryptoBalanceByFilter } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { OsmosisWithdrawActionType } from '../LpWithdrawCommon'
import { WithdrawContext } from '../LpWithdrawContext'

type AssetWithBaseUnitBalance = {
  cryptoBalanceBaseUnit: string
  allocationPercentage?: string
  icons?: string[]
} & Asset

type opportunityBalanceData = {
  underlyingAssetBalances: AssetWithBaseUnitBalance[]
  fiatBalance: string
}

type receiveAmount = {
  cryptoAmountBaseUnit: string
  fiatAmount: string
}

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Osmosis', 'Withdraw', 'Withdraw'],
})

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
    opportunityBalanceData | undefined
  >(undefined)
  const [receiveAmounts, setReceiveAmounts] = useState<receiveAmount[] | undefined>([
    { cryptoAmountBaseUnit: '0', fiatAmount: '0' },
    { cryptoAmountBaseUnit: '0', fiatAmount: '0' },
  ])
  const [poolData, setPoolData] = useState<OsmosisPool | undefined>(undefined)

  const { chainId, assetReference } = query
  const osmosisOpportunity = state?.opportunity

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { setValue } = methods

  const lpAsset: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.assetId ?? ''),
  )

  const lpAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, {
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

  const { data: underlyingAsset0Data } = useFindByAssetIdQuery(underlyingAsset0?.assetId || '')
  const underlyingAsset0MarketData = underlyingAsset0Data?.[underlyingAsset0?.assetId || '']

  const { data: underlyingAsset1Data } = useFindByAssetIdQuery(underlyingAsset1?.assetId || '')
  const underlyingAsset1MarketData = underlyingAsset1Data?.[underlyingAsset1?.assetId || '']

  const toast = useToast()

  const getWithdrawFeeEstimate = useCallback(async (): Promise<string | undefined> => {
    if (!(assetReference && accountId && osmosisOpportunity)) return
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
        bnOrZero(fastFeeCryptoBaseUnit).div(bn(10).pow(lpAsset?.precision ?? '0')),
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
    }
  }, [assetReference, accountId, lpAsset?.precision, osmosisOpportunity, chainId, toast, translate])

  const calculateBalances = useCallback(
    async (
      lpAsset: Asset,
      lpAssetBalanceBaseUnit: string,
    ): Promise<opportunityBalanceData | undefined> => {
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

      const poolOwnershipFraction = bnOrZero(lpAssetBalanceBaseUnit)
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
        underlyingAssetBalances: [
          {
            ...underlyingAsset0,
            allocationPercentage: underlyingAsset0AllocationPercentage,
            cryptoBalanceBaseUnit: underlyingAsset0Balance,
          },
          {
            ...underlyingAsset1,
            allocationPercentage: underlyingAsset1AllocationPercentage,
            cryptoBalanceBaseUnit: underlyingAsset1Balance,
          },
        ],
        fiatBalance: bnOrZero(poolOwnershipFraction)
          .multipliedBy(bnOrZero(osmosisOpportunity.tvl))
          .toString(),
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
        .toFixed(0)
        .toString()
      const tokenOut1AmountBaseUnit = bnOrZero(poolData.pool_assets[1].token.amount)
        .multipliedBy(poolShareFraction)
        .toFixed(0)
        .toString()

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
    if (!(lpAsset && lpAssetMarketData)) return
    const divisor = bnOrZero(lpAssetMarketData.price)

    const _value = isFiat
      ? bnOrZero(value)
          .dividedBy(divisor.toFixed() ?? 1)
          .toString()
      : value
    ;(async () => {
      const amounts = await calculateBalances(lpAsset, _value)
      if (!amounts) return
      const receiveAmounts = [
        {
          cryptoAmountBaseUnit: amounts.underlyingAssetBalances[0].cryptoBalanceBaseUnit,
          fiatAmount: bnOrZero(amounts.fiatBalance)
            .multipliedBy(bnOrZero(amounts.underlyingAssetBalances[0].allocationPercentage))
            .toString(),
        },
        {
          cryptoAmountBaseUnit: amounts.underlyingAssetBalances[1].cryptoBalanceBaseUnit,
          fiatAmount: bnOrZero(amounts.fiatBalance)
            .multipliedBy(bnOrZero(amounts.underlyingAssetBalances[1].allocationPercentage))
            .toString(),
        },
      ]
      setReceiveAmounts(receiveAmounts)
    })()
  }

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (!(state && contextDispatch && osmosisOpportunity && underlyingAsset0 && underlyingAsset1))
        return
      // set withdraw state for future use
      contextDispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: true })
      const tokenOutMins = await calculateTokenOutMins(
        bnOrZero(formValues.cryptoAmount)
          .multipliedBy(bn(10).pow(lpAsset?.precision ?? '0'))
          .toString(),
      )
      if (!tokenOutMins) return
      contextDispatch({
        type: OsmosisWithdrawActionType.SET_WITHDRAW,
        payload: {
          underlyingAsset0: tokenOutMins[0],
          underlyingAsset1: tokenOutMins[1],
          shareOutAmountBaseUnit: bnOrZero(formValues.cryptoAmount)
            .multipliedBy(bn(10).pow(lpAsset?.precision ?? '0'))
            .toString(),
        },
      })

      const estimatedFeeCryptoBaseUnit = await getWithdrawFeeEstimate()
      if (!estimatedFeeCryptoBaseUnit) {
        contextDispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: false })
        return
      }
      contextDispatch({
        type: OsmosisWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedFeeCryptoBaseUnit },
      })
      onNext(DefiStep.Confirm)
      contextDispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: false })
    },
    [
      state,
      contextDispatch,
      lpAsset?.precision,
      osmosisOpportunity,
      underlyingAsset0,
      underlyingAsset1,
      calculateTokenOutMins,
      getWithdrawFeeEstimate,
      onNext,
    ],
  )

  const handleCancel = browserHistory.goBack

  const handlePercentClick = (percent: number) => {
    if (!opportunityBalances) return
    const cryptoAmountBaseUnit = bnOrZero(lpAssetBalance).multipliedBy(percent).toString()
    const cryptoAmountPrecision = bnOrZero(cryptoAmountBaseUnit)
      .dividedBy(bnOrZero(bn(10).pow(lpAsset?.precision ?? '0')))
      .toString()
    const fiatAmount = bnOrZero(opportunityBalances?.fiatBalance).multipliedBy(percent).toString()

    setValue(Field.FiatAmount, fiatAmount, { shouldValidate: true })
    setValue(Field.CryptoAmount, cryptoAmountPrecision, { shouldValidate: true })
    handleInputChange(cryptoAmountBaseUnit, false)
  }

  useEffect(() => {
    // Calculate underlying token balances
    if (!lpAsset) return
    ;(async () => {
      const balances = await calculateBalances(lpAsset, lpAssetBalance)
      if (!balances) return
      setOpportunityBalances(balances)
    })()
  }, [calculateBalances, lpAsset, lpAssetBalance, poolData, state])

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
    const lpAssetBalanceBaseUnit = bnOrZero(lpAssetBalance)
    const _value = bnOrZero(value)
    const hasValidBalance =
      lpAssetBalanceBaseUnit.gt(0) && _value.gt(0) && lpAssetBalanceBaseUnit.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const _value = bnOrZero(value)
    const fiatBalance = bnOrZero(opportunityBalances.fiatBalance)
    const hasValidBalance = fiatBalance.gt(0) && _value.gt(0) && fiatBalance.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        asset={lpAsset}
        icons={osmosisOpportunity?.icons}
        cryptoAmountAvailable={bnOrZero(lpAssetBalance)
          .dividedBy(bn(10).pow(lpAsset.precision ?? '0'))
          .toPrecision()}
        cryptoInputValidation={{
          required: true,
          validate: { validateCryptoAmount },
        }}
        fiatAmountAvailable={opportunityBalances?.fiatBalance}
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
            cryptoAmount={bnOrZero(
              fromBaseUnit(
                receiveAmounts?.[0]?.cryptoAmountBaseUnit ?? '0',
                underlyingAsset0.precision,
              ),
            ).toString()}
            fiatAmount={bnOrZero(receiveAmounts?.[0]?.fiatAmount).toFixed(2) ?? '0'}
            showFiatAmount={true}
            assetId={underlyingAsset0.assetId}
            assetIcon={underlyingAsset0.icon}
            assetSymbol={underlyingAsset0.symbol}
            balance={bnOrZero(opportunityBalances.underlyingAssetBalances[0].cryptoBalanceBaseUnit)
              .div(bn(10).pow(underlyingAsset0.precision ?? '0'))
              .toFixed()}
            fiatBalance={bnOrZero(
              fromBaseUnit(
                opportunityBalances.underlyingAssetBalances[0].cryptoBalanceBaseUnit,
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
            cryptoAmount={bnOrZero(
              fromBaseUnit(
                receiveAmounts?.[1]?.cryptoAmountBaseUnit ?? '0',
                underlyingAsset1.precision,
              ),
            ).toString()}
            fiatAmount={bnOrZero(receiveAmounts?.[1]?.fiatAmount).toFixed(2) ?? '0'}
            showFiatAmount={true}
            assetId={underlyingAsset1.assetId}
            assetIcon={underlyingAsset1.icon}
            assetSymbol={underlyingAsset1.symbol}
            balance={bnOrZero(opportunityBalances.underlyingAssetBalances[1].cryptoBalanceBaseUnit)
              .div(bn(10).pow(underlyingAsset1.precision ?? '0'))
              .toFixed()}
            fiatBalance={bnOrZero(
              fromBaseUnit(
                opportunityBalances.underlyingAssetBalances[1].cryptoBalanceBaseUnit,
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
