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
import type { MarketData } from '@shapeshiftoss/types'
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
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit } from 'lib/math'
import { useFindByAssetIdQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  getPool,
  getPoolIdFromAssetReference,
} from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import {
  selectAssetById,
  selectAssets,
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { OsmosisWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

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
  const { chainId, assetNamespace, assetReference } = query
  const osmosisOpportunity = state?.opportunity

  const [poolAssetMarketData, setPoolAssetMarketData] = useState<MarketData | undefined>(undefined)

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { setValue } = methods

  const assets = useAppSelector(selectAssets)

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId))

  const underlyingAsset0 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[0] ?? ''),
  )
  const underlyingAsset1 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[1] ?? ''),
  )

  const [underlyingAsset0AmountCryptoBaseUnit, setUnderlyingAsset0AmountCryptoBaseUnit] =
    useState('0')
  const [underlyingAsset1AmountCryptoBaseUnit, setUnderlyingAsset1AmountCryptoBaseUnit] =
    useState('0')

  const { data: underlyingAsset0Data } = useFindByAssetIdQuery(underlyingAsset0?.assetId || '')
  const underlyingAsset0MarketData = underlyingAsset0Data?.[underlyingAsset0?.assetId || '']

  const { data: underlyingAsset1Data } = useFindByAssetIdQuery(underlyingAsset1?.assetId || '')
  const underlyingAsset1MarketData = underlyingAsset1Data?.[underlyingAsset1?.assetId || '']

  const userAddress = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])

  const toast = useToast()

  const getWithdrawFeeEstimate = useCallback(async (): Promise<string | undefined> => {
    if (!(userAddress && assetReference && accountId && osmosisOpportunity)) return
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
        bnOrZero(fastFeeCryptoBaseUnit).div(bn(10).pow(asset?.precision ?? 0)),
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
  }, [userAddress, assetReference, accountId, osmosisOpportunity, asset, chainId, toast, translate])

  const underlyingAsset0AmountCryptoPrecision = bnOrZero(underlyingAsset0AmountCryptoBaseUnit)
    .dividedBy(bn(10).pow(underlyingAsset0?.precision ?? 0))
    .toString()

  const underlyingAsset1AmountCryptoPrecision = bnOrZero(underlyingAsset1AmountCryptoBaseUnit)
    .dividedBy(bn(10).pow(underlyingAsset0?.precision ?? 0))
    .toString()

  const fiatAmountAvailable = bnOrZero(osmosisOpportunity?.cryptoAmountBaseUnit)
    .div(bn(10).pow(asset?.precision ?? 0))
    .times(poolAssetMarketData ? poolAssetMarketData?.price ?? '0' : '0')
    .toString()

  // user info

  const lpAsset = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.assetId ?? ''),
  )
  const lpAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, {
      assetId: osmosisOpportunity?.assetId,
      accountId: accountId ?? '',
    }),
  )

  const cryptoAmountAvailable = bnOrZero(lpAssetBalance).div(bn(10).pow(asset?.precision ?? 0))

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

      const poolData = await getPool(id)

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

      /** asset_n_proportional_weight = asset_n_weight / total_pool_weight
       * This represents the proportional weight (think partial pressure from chemistry ) of asset n in the liquidity pool */
      const asset0ProportionalWeight = bnOrZero(poolData.pool_assets[0].weight)
        .dividedBy(bnOrZero(poolData.total_weight))
        .toString()
      const asset1ProportionalWeight = bnOrZero(poolData.pool_assets[1].weight)
        .dividedBy(bnOrZero(poolData.total_weight))
        .toString()

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
        .multipliedBy(asset0ProportionalWeight)
        .toString()
      const tokenOut1AmountBaseUnit = bnOrZero(poolData.pool_assets[1].token.amount)
        .multipliedBy(poolShareFraction)
        .multipliedBy(asset1ProportionalWeight)
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
    [osmosisOpportunity, state, underlyingAsset0, underlyingAsset1],
  )

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (
        !(
          asset &&
          state &&
          contextDispatch &&
          userAddress &&
          osmosisOpportunity &&
          underlyingAsset0 &&
          underlyingAsset1
        )
      )
        return
      // set withdraw state for future use
      contextDispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: true })
      const tokenOutMins = await calculateTokenOutMins(formValues.cryptoAmount)
      if (!tokenOutMins) return
      contextDispatch({
        type: OsmosisWithdrawActionType.SET_WITHDRAW,
        payload: {
          underlyingAsset0: tokenOutMins[0],
          underlyingAsset1: tokenOutMins[1],
          shareInAmount: formValues.cryptoAmount,
        },
      })

      const estimatedFeeCrypto = await getWithdrawFeeEstimate()
      if (!estimatedFeeCrypto) {
        contextDispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: false })
        return
      }
      contextDispatch({
        type: OsmosisWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedFeeCrypto },
      })
      onNext(DefiStep.Confirm)
      contextDispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: false })
    },
    [
      asset,
      state,
      contextDispatch,
      userAddress,
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
    const cryptoAmount = bnOrZero(cryptoAmountAvailable).times(percent).toString()
    const fiatAmount = bnOrZero(fiatAmountAvailable).times(percent).toString()

    setValue(Field.FiatAmount, fiatAmount, { shouldValidate: true })
    setValue(Field.CryptoAmount, cryptoAmount, { shouldValidate: true })
    if (
      osmosisOpportunity?.underlyingToken1AmountCryptoBaseUnit &&
      osmosisOpportunity?.underlyingToken0AmountCryptoBaseUnit
    ) {
      setUnderlyingAsset1AmountCryptoBaseUnit(
        bnOrZero(percent).times(osmosisOpportunity.underlyingToken1AmountCryptoBaseUnit).toFixed(),
      )
      setUnderlyingAsset0AmountCryptoBaseUnit(
        bnOrZero(percent).times(osmosisOpportunity.underlyingToken0AmountCryptoBaseUnit).toFixed(),
      )
    }
  }
  const handleInputChange = (value: string, isFiat?: boolean) => {
    const percentage = bnOrZero(value).div(
      bnOrZero(isFiat ? fiatAmountAvailable : cryptoAmountAvailable),
    )
    if (
      osmosisOpportunity?.underlyingToken1AmountCryptoBaseUnit &&
      osmosisOpportunity?.underlyingToken0AmountCryptoBaseUnit
    ) {
      setUnderlyingAsset1AmountCryptoBaseUnit(
        percentage.times(osmosisOpportunity.underlyingToken1AmountCryptoBaseUnit).toFixed(8),
      )
      setUnderlyingAsset0AmountCryptoBaseUnit(
        percentage.times(osmosisOpportunity.underlyingToken0AmountCryptoBaseUnit).toFixed(8),
      )
    }
  }

  useEffect(() => {
    const getPoolAssetMarketData = async () => {
      /* No market exists for Osmosis pool assets, but we can calculate the 'price' of each pool token
    by dividing the pool TVL by the total number of pool tokens. */
      if (!(state && state.opportunity)) return undefined

      const { assetReference: poolAssetReference } = fromAssetId(state.opportunity.assetId)
      const id = getPoolIdFromAssetReference(poolAssetReference)
      if (!id) return undefined

      const poolData = await getPool(id)
      if (!(poolData && poolData.total_shares)) return undefined

      setPoolAssetMarketData({
        price: bnOrZero(poolData.tvl).dividedBy(bnOrZero(poolData.total_shares.amount)).toString(),
        marketCap: bnOrZero(poolData.tvl).toString(),
        volume: bn(0).toString(),
        changePercent24Hr: bn(0).toNumber(),
        supply: bnOrZero(poolData.total_shares.amount).toString(),
        maxSupply: bnOrZero(poolData.total_shares.amount).toString(),
      })
    }
    getPoolAssetMarketData()
  }, [state])

  if (
    !(
      asset &&
      state &&
      osmosisOpportunity &&
      underlyingAsset0 &&
      underlyingAsset1 &&
      poolAssetMarketData &&
      underlyingAsset0MarketData &&
      underlyingAsset1MarketData &&
      osmosisOpportunity?.icons
    )
  ) {
    return null
  }

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const _value = bnOrZero(value)
    const fiat = bnOrZero(fiatAmountAvailable)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        asset={asset}
        icons={osmosisOpportunity?.icons}
        cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
        cryptoInputValidation={{
          required: true,
          validate: { validateCryptoAmount },
        }}
        fiatAmountAvailable={fiatAmountAvailable.toString()}
        fiatInputValidation={{
          required: true,
          validate: { validateFiatAmount },
        }}
        marketData={poolAssetMarketData}
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
            cryptoAmount={underlyingAsset0AmountCryptoPrecision}
            fiatAmount={bnOrZero(underlyingAsset0AmountCryptoPrecision)
              .times(underlyingAsset0MarketData?.price)
              .toFixed(2)}
            showFiatAmount={true}
            assetId={underlyingAsset0.assetId}
            assetIcon={underlyingAsset0.icon}
            assetSymbol={underlyingAsset0.symbol}
            balance={bnOrZero(osmosisOpportunity.underlyingToken0AmountCryptoBaseUnit)
              .div(
                bn(10).pow(
                  assets[osmosisOpportunity?.underlyingAssetIds?.[0] ?? '']?.precision ?? '0',
                ),
              )
              .toFixed()}
            fiatBalance={bnOrZero(
              fromBaseUnit(
                osmosisOpportunity?.underlyingToken0AmountCryptoBaseUnit ?? '0',
                underlyingAsset0?.precision,
              ),
            )
              .times(underlyingAsset0MarketData?.price)
              .toFixed(2)}
            percentOptions={[]}
            isReadOnly={true}
          />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmount={underlyingAsset1AmountCryptoPrecision}
            fiatAmount={bnOrZero(underlyingAsset1AmountCryptoPrecision)
              .times(underlyingAsset1MarketData?.price)
              .toFixed(2)}
            showFiatAmount={true}
            assetId={underlyingAsset1.assetId}
            assetIcon={underlyingAsset1.icon}
            assetSymbol={underlyingAsset1.symbol}
            balance={bnOrZero(osmosisOpportunity.underlyingToken1AmountCryptoBaseUnit)
              .div(
                bn(10).pow(
                  assets[osmosisOpportunity?.underlyingAssetIds?.[1] ?? '']?.precision ?? '0',
                ),
              )
              .toFixed()}
            fiatBalance={bnOrZero(
              fromBaseUnit(
                osmosisOpportunity?.underlyingToken1AmountCryptoBaseUnit ?? '0',
                underlyingAsset1?.precision,
              ),
            )
              .times(underlyingAsset1MarketData?.price)
              .toFixed(2)}
            percentOptions={[]}
            isReadOnly={true}
          />
        </>
      </ReusableWithdraw>
    </FormProvider>
  )
}
