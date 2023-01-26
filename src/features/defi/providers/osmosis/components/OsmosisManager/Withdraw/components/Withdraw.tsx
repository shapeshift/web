import { useToast } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useMemo, useState } from 'react'
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
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import { toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserLpOpportunity,
  selectMarketDataById,
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
  const { state, dispatch } = useContext(WithdrawContext)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const assets = useAppSelector(selectAssets)
  const translate = useTranslate()
  const toast = useToast()

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const opportunityId: LpId | undefined = useMemo(
    () => (assetId ? toOpportunityId({ chainId, assetNamespace, assetReference }) : undefined),
    [assetId, assetNamespace, assetReference, chainId],
  )

  const OsmosisLpOpportunityFilter = useMemo(
    () => ({
      lpId: opportunityId,
      assetId,
      accountId,
    }),
    [accountId, assetId, opportunityId],
  )

  const opportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, OsmosisLpOpportunityFilter),
  )

  const [underlyingAsset0AmountCryptoBaseUnit, setUnderlyingAsset0AmountCryptoBaseUnit] =
    useState('0')
  const [underlyingAsset1AmountCryptoBaseUnit, setUnderlyingAsset1AmountCryptoBaseUnit] =
    useState('0')

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { setValue } = methods

  const underlyingAsset0Id = opportunity?.underlyingAssetIds[0]
  const underlyingAsset1Id = opportunity?.underlyingAssetIds[1]

  if (!underlyingAsset0Id)
    throw new Error(`No underlying asset 0 ID found for opportunity ${opportunity?.name}`)
  if (!underlyingAsset1Id)
    throw new Error(`No underlying asset 1 ID found for opportunity ${opportunity?.name}`)

  const asset: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, opportunity?.assetId ?? ''),
  )
  const underlyingAsset0 = useAppSelector(state => selectAssetById(state, underlyingAsset0Id))
  const underlyingAsset1 = useAppSelector(state => selectAssetById(state, underlyingAsset1Id))

  if (!asset) throw new Error(`Asset not found for AssetId ${opportunity?.assetId}`)
  if (!underlyingAsset0) throw new Error(`Asset not found for AssetId ${underlyingAsset0Id}`)
  if (!underlyingAsset1) throw new Error(`Asset not found for AssetId ${underlyingAsset1Id}`)

  const assetMarketData = useAppSelector(state => selectMarketDataById(state, assetId ?? ''))
  const underlyingAsset0MarketData = useAppSelector(state =>
    selectMarketDataById(state, underlyingAsset0Id),
  )
  const underlyingAsset1MarketData = useAppSelector(state =>
    selectMarketDataById(state, underlyingAsset1Id),
  )

  const underlyingAsset0AmountCryptoPrecision = useMemo(
    () => fromBaseUnit(underlyingAsset0AmountCryptoBaseUnit, underlyingAsset0.precision),
    [underlyingAsset0AmountCryptoBaseUnit, underlyingAsset0.precision],
  )
  const underlyingAsset1AmountCryptoPrecision = useMemo(
    () => fromBaseUnit(underlyingAsset1AmountCryptoBaseUnit, underlyingAsset1.precision),
    [underlyingAsset1AmountCryptoBaseUnit, underlyingAsset1.precision],
  )

  const fiatAmountAvailable = bnOrZero(opportunity?.cryptoAmountBaseUnit)
    .div(bn(10).pow(asset.precision))
    .times(assetMarketData?.price ?? '0')
    .toString()

  // user info
  const userAddress = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])
  const filter = useMemo(
    () => ({ assetId: opportunity?.assetId ?? '', accountId: accountId ?? '' }),
    [opportunity?.assetId, accountId],
  )
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByFilter(state, filter))

  const cryptoAmountAvailable = bnOrZero(balance).div(bn(10).pow(asset?.precision))

  const getWithdrawFeeEstimate = useCallback(async (): Promise<string | undefined> => {
    if (!(userAddress && assetReference && accountId && opportunity)) return
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
        bnOrZero(fastFeeCryptoBaseUnit).div(bn(10).pow(asset.precision)),
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
  }, [userAddress, assetReference, accountId, opportunity, asset, chainId, toast, translate])

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (!(userAddress && dispatch)) return
      // set withdraw state for future use
      dispatch({
        type: OsmosisWithdrawActionType.SET_WITHDRAW,
        payload: {
          underlyingAsset0: {
            amount: formValues.cryptoAmount1,
            denom: fromAssetId(underlyingAsset0.assetId).assetReference,
            fiatAmount: formValues.fiatAmount1,
          },
          underlyingAsset1: {
            amount: formValues.cryptoAmount2,
            denom: fromAssetId(underlyingAsset1.assetId).assetReference,
            fiatAmount: formValues.cryptoAmount2,
          },
          shareOutAmount: '0',
        },
      })
      dispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: true })
      const estimatedFeeCrypto = await getWithdrawFeeEstimate()
      if (!estimatedFeeCrypto) return
      dispatch({
        type: OsmosisWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedFeeCrypto },
      })
      onNext(DefiStep.Confirm)
      dispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: false })
    },
    [
      userAddress,
      getWithdrawFeeEstimate,
      underlyingAsset0AmountCryptoPrecision,
      underlyingAsset1AmountCryptoPrecision,
      onNext,
      dispatch,
    ],
  )

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const handlePercentClick = (percent: number) => {
    const cryptoAmount = bnOrZero(cryptoAmountAvailable).times(percent).toString()
    const fiatAmount = bnOrZero(fiatAmountAvailable).times(percent).toString()

    setValue(Field.FiatAmount, fiatAmount, { shouldValidate: true })
    setValue(Field.CryptoAmount, cryptoAmount, { shouldValidate: true })
    if (
      opportunity?.underlyingToken1AmountCryptoBaseUnit &&
      opportunity?.underlyingToken0AmountCryptoBaseUnit
    ) {
      setUnderlyingAsset1AmountCryptoBaseUnit(
        bnOrZero(percent).times(opportunity.underlyingToken1AmountCryptoBaseUnit).toFixed(),
      )
      setUnderlyingAsset0AmountCryptoBaseUnit(
        bnOrZero(percent).times(opportunity.underlyingToken0AmountCryptoBaseUnit).toFixed(),
      )
    }
  }
  const handleInputChange = (value: string, isFiat?: boolean) => {
    const percentage = bnOrZero(value).div(
      bnOrZero(isFiat ? fiatAmountAvailable : cryptoAmountAvailable),
    )
    if (
      opportunity?.underlyingToken1AmountCryptoBaseUnit &&
      opportunity?.underlyingToken0AmountCryptoBaseUnit
    ) {
      setUnderlyingAsset1AmountCryptoBaseUnit(
        percentage.times(opportunity.underlyingToken1AmountCryptoBaseUnit).toFixed(8),
      )
      setUnderlyingAsset0AmountCryptoBaseUnit(
        percentage.times(opportunity.underlyingToken0AmountCryptoBaseUnit).toFixed(8),
      )
    }
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

  if (!state) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        asset={asset}
        icons={opportunity?.icons}
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
        marketData={assetMarketData}
        onAccountIdChange={handleAccountIdChange}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading || !opportunity}
        percentOptions={[0.25, 0.5, 0.75, 1]}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
        onInputChange={handleInputChange}
      >
        <>
          <Text translation='common.receive' />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmount={underlyingAsset1AmountCryptoPrecision}
            fiatAmount={bnOrZero(underlyingAsset1AmountCryptoPrecision)
              .times(underlyingAsset1MarketData.price)
              .toFixed(2)}
            showFiatAmount={true}
            assetIcon={underlyingAsset1.icon}
            assetSymbol={underlyingAsset1.symbol}
            balance={bnOrZero(opportunity.underlyingToken1AmountCryptoBaseUnit)
              .div(bn(10).pow(assets[opportunity?.underlyingAssetIds?.[1] ?? '']?.precision ?? '0'))
              .toFixed()}
            fiatBalance={bnOrZero(
              fromBaseUnit(
                opportunity?.underlyingToken1AmountCryptoBaseUnit ?? '0',
                underlyingAsset1.precision,
              ),
            )
              .times(underlyingAsset1MarketData.price)
              .toFixed(2)}
            percentOptions={[]}
            isReadOnly={true}
          />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmount={underlyingAsset0AmountCryptoPrecision}
            fiatAmount={bnOrZero(underlyingAsset0AmountCryptoPrecision)
              .times(underlyingAsset0MarketData.price)
              .toFixed(2)}
            showFiatAmount={true}
            assetIcon={underlyingAsset0.icon}
            assetSymbol={underlyingAsset0.symbol}
            balance={bnOrZero(opportunity.underlyingToken0AmountCryptoBaseUnit)
              .div(bn(10).pow(assets[opportunity?.underlyingAssetIds?.[0] ?? '']?.precision ?? '0'))
              .toFixed()}
            fiatBalance={bnOrZero(
              fromBaseUnit(
                opportunity?.underlyingToken0AmountCryptoBaseUnit ?? '0',
                underlyingAsset0.precision,
              ),
            )
              .times(underlyingAsset0MarketData.price)
              .toFixed(2)}
            percentOptions={[]}
            isReadOnly={true}
          />
        </>
      </ReusableWithdraw>
    </FormProvider>
  )
}
