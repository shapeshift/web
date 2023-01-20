import { useToast } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import { Deposit as ReusableDeposit } from 'features/defi/components/Deposit/Deposit'
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
import { getIsTradingActiveApi } from 'state/apis/swapper/getIsTradingActiveApi'
import {
  getThorchainSaversDepositQuote,
  isAboveDepositDustThreshold,
  THORCHAIN_SAVERS_DUST_THRESHOLDS,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { ThorchainSaversDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({ namespace: ['ThorchainSaversDeposit:Deposit'] })

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
  const appDispatch = useAppDispatch()
  const history = useHistory()
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
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

  const userAddress = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])
  const balanceFilter = useMemo(() => ({ assetId, accountId }), [accountId, assetId])
  // user info
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, balanceFilter),
  )

  // notify
  const toast = useToast()

  const getDepositGasEstimate = useCallback(
    async (deposit: DepositValues): Promise<string | undefined> => {
      if (!(userAddress && assetReference && accountId && opportunityData)) return
      try {
        const amountCryptoBaseUnit = bnOrZero(deposit.cryptoAmount).times(
          bn(10).pow(asset.precision),
        )
        const quote = await getThorchainSaversDepositQuote({ asset, amountCryptoBaseUnit })
        const chainAdapters = getChainAdapterManager()
        // We're lying to Ts, this isn't always an UtxoBaseAdapter
        // But typing this as any chain-adapter won't narrow down its type and we'll have errors at `chainSpecific` property
        const adapter = chainAdapters.get(chainId) as unknown as UtxoBaseAdapter<UtxoChainId>
        const fastFeeCryptoBaseUnit = (
          await adapter.getFeeData({
            to: quote.inbound_address,
            value: amountCryptoBaseUnit.toFixed(0),
            chainSpecific: { pubkey: userAddress, from: '' },
            sendMax: false,
          })
        ).fast.txFee

        const fastFeeCryptoPrecision = bnOrZero(
          bn(fastFeeCryptoBaseUnit).div(bn(10).pow(asset.precision)),
        )
        return bnOrZero(fastFeeCryptoPrecision).toString()
      } catch (error) {
        moduleLogger.error(
          { fn: 'getDepositGasEstimate', error },
          'Error getting deposit gas estimate',
        )
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
      }
    },
    [userAddress, assetReference, accountId, opportunityData, asset, chainId, toast, translate],
  )

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (!(userAddress && opportunityData && contextDispatch)) return
      // set deposit state for future use
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_DEPOSIT, payload: formValues })
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })
      try {
        const { getIsTradingActive } = getIsTradingActiveApi.endpoints
        const { data: isTradingActive } = await appDispatch(
          getIsTradingActive.initiate({
            assetId,
            swapperName: SwapperName.Thorchain,
          }),
        )

        if (!isTradingActive) {
          throw new Error(`THORChain pool halted for assetId: ${assetId}`)
        }

        const estimatedGasCrypto = await getDepositGasEstimate(formValues)
        if (!estimatedGasCrypto) return
        contextDispatch({
          type: ThorchainSaversDepositActionType.SET_DEPOSIT,
          payload: { estimatedGasCrypto },
        })
        onNext(DefiStep.Confirm)
        contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
      } catch (error) {
        moduleLogger.error({ fn: 'handleContinue', error }, 'Error on continue')
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
        contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
      }
    },
    [
      userAddress,
      opportunityData,
      contextDispatch,
      appDispatch,
      assetId,
      getDepositGasEstimate,
      onNext,
      toast,
      translate,
    ],
  )

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const valueCryptoBaseUnit = bnOrZero(value).times(bn(10).pow(asset.precision))
      const isBelowMinSellAmount = !isAboveDepositDustThreshold({ valueCryptoBaseUnit, assetId })

      const minLimitCryptoPrecision = bn(THORCHAIN_SAVERS_DUST_THRESHOLDS[assetId]).div(
        bn(10).pow(asset.precision),
      )
      const minLimit = `${minLimitCryptoPrecision} ${asset.symbol}`

      if (isBelowMinSellAmount) return translate('trade.errors.amountTooSmall', { minLimit })

      const cryptoBalancePrecision = bnOrZero(balance).div(bn(10).pow(asset.precision))
      const valueCryptoPrecision = bnOrZero(value)
      const hasValidBalance =
        cryptoBalancePrecision.gt(0) &&
        valueCryptoPrecision.gt(0) &&
        cryptoBalancePrecision.gte(value)
      if (valueCryptoPrecision.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [asset.precision, asset.symbol, assetId, translate, balance],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(balance).div(bn(10).pow(asset.precision))

      const valueCryptoBaseUnit = bnOrZero(value)
        .div(marketData.price)
        .times(bn(10).pow(asset.precision))
      const isBelowMinSellAmount = !isAboveDepositDustThreshold({ valueCryptoBaseUnit, assetId })

      const minLimitCryptoPrecision = bn(THORCHAIN_SAVERS_DUST_THRESHOLDS[assetId]).div(
        bn(10).pow(asset.precision),
      )
      const minLimit = `${minLimitCryptoPrecision} ${asset.symbol}`

      if (isBelowMinSellAmount) return translate('trade.errors.amountTooSmall', { minLimit })

      const fiat = crypto.times(marketData.price)
      const _value = bnOrZero(value)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [balance, asset.precision, asset.symbol, marketData.price, assetId, translate],
  )

  const cryptoAmountAvailable = useMemo(
    () => bnOrZero(balance).div(bn(10).pow(asset.precision)),
    [balance, asset?.precision],
  )
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(cryptoAmountAvailable).times(marketData.price),
    [cryptoAmountAvailable, marketData?.price],
  )

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
      onContinue={handleContinue}
      onBack={handleBack}
      percentOptions={[0.25, 0.5, 0.75, 1]}
      enableSlippage={false}
      isLoading={state.loading}
    />
  )
}
