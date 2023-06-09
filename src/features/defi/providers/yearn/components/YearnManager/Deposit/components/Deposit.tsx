import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import { Deposit as ReusableDeposit } from 'features/defi/components/Deposit/Deposit'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getYearnInvestor } from 'features/defi/contexts/YearnProvider/yearnInvestorSingleton'
import qs from 'qs'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { YearnDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type DepositProps = StepComponentProps & {
  accountId?: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
} & StepComponentProps

export const Deposit: React.FC<DepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const yearnInvestor = useMemo(() => getYearnInvestor(), [])
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference, contractAddress } = query

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace: 'erc20', assetReference: contractAddress }),
    [chainId, contractAddress],
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
        (accountId ?? highestBalanceAccountId)!,
        toOpportunityId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: contractAddress,
        }),
      ),
    }),
    [accountId, chainId, contractAddress, highestBalanceAccountId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const assetId = useMemo(
    () => opportunityData?.underlyingAssetIds[0] ?? '',
    [opportunityData?.underlyingAssetIds],
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

  // notify
  const toast = useToast()

  const getDepositGasEstimateCryptoPrecision = useCallback(
    async (deposit: DepositValues): Promise<string | undefined> => {
      if (!(userAddress && assetReference && yearnInvestor && accountId && opportunityData)) return
      try {
        const yearnOpportunity = await yearnInvestor.findByOpportunityId(opportunityData.assetId)
        if (!yearnOpportunity) throw new Error('No opportunity')
        const preparedTx = await yearnOpportunity.prepareDeposit({
          amount: bnOrZero(deposit.cryptoAmount).times(`1e+${asset.precision}`).integerValue(),
          address: fromAccountId(accountId).account,
        })
        // TODO(theobold): Figure out a better way for the safety factor
        return bnOrZero(preparedTx.gasPrice)
          .times(preparedTx.estimatedGas)
          .integerValue()
          .toString()
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
      yearnInvestor,
      accountId,
      opportunityData,
      asset.precision,
      toast,
      translate,
    ],
  )

  const getApproveGasEstimate = useCallback(async (): Promise<string | undefined> => {
    if (!(userAddress && assetReference && opportunityData)) return
    try {
      const yearnOpportunity = await yearnInvestor.findByOpportunityId(
        opportunityData.assetId ?? '',
      )
      if (!yearnOpportunity) throw new Error('No opportunity')
      const preparedApproval = await yearnOpportunity.prepareApprove(userAddress)
      return bnOrZero(preparedApproval.gasPrice)
        .times(preparedApproval.estimatedGas)
        .integerValue()
        .toString()
    } catch (error) {
      console.error(error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    }
  }, [userAddress, assetReference, opportunityData, yearnInvestor, toast, translate])

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (!(userAddress && opportunityData && dispatch)) return
      // set deposit state for future use
      dispatch({ type: YearnDepositActionType.SET_DEPOSIT, payload: formValues })
      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: true })
      try {
        // Check is approval is required for user address
        const yearnOpportunity = await yearnInvestor.findByOpportunityId(
          opportunityData.assetId ?? '',
        )
        if (!yearnOpportunity) throw new Error('No opportunity')
        const _allowance = await yearnOpportunity.allowance(userAddress)
        const allowance = bnOrZero(_allowance).div(`1e+${asset.precision}`)

        // Skip approval step if user allowance is greater than requested deposit amount
        if (allowance.gte(formValues.cryptoAmount)) {
          const estimatedGasCrypto = await getDepositGasEstimateCryptoPrecision(formValues)
          if (!estimatedGasCrypto) return
          dispatch({
            type: YearnDepositActionType.SET_DEPOSIT,
            payload: { estimatedGasCryptoBaseUnit: estimatedGasCrypto },
          })
          onNext(DefiStep.Confirm)
          dispatch({ type: YearnDepositActionType.SET_LOADING, payload: false })
        } else {
          const estimatedGasCrypto = await getApproveGasEstimate()
          if (!estimatedGasCrypto) return
          dispatch({
            type: YearnDepositActionType.SET_APPROVE,
            payload: { estimatedGasCryptoBaseUnit: estimatedGasCrypto },
          })
          onNext(DefiStep.Approve)
          dispatch({ type: YearnDepositActionType.SET_LOADING, payload: false })
        }
      } catch (error) {
        console.error(error)
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
        dispatch({ type: YearnDepositActionType.SET_LOADING, payload: false })
      }
    },
    [
      userAddress,
      opportunityData,
      dispatch,
      yearnInvestor,
      asset.precision,
      getDepositGasEstimateCryptoPrecision,
      onNext,
      getApproveGasEstimate,
      toast,
      translate,
    ],
  )

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
      const _value = bnOrZero(value)
      const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [balance, asset?.precision],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
      const fiat = crypto.times(marketData.price)
      const _value = bnOrZero(value)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [balance, asset?.precision, marketData?.price],
  )

  const cryptoAmountAvailable = useMemo(
    () => bnOrZero(balance).div(`1e${asset.precision}`),
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

  if (!state || !dispatch || !opportunityData) return null

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
