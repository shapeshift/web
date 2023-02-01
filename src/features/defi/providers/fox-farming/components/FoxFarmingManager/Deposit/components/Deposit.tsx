import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import { Deposit as ReusableDeposit } from 'features/defi/components/Deposit/Deposit'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxEthLiquidityPool } from 'features/defi/providers/fox-eth-lp/hooks/useFoxEthLiquidityPool'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import qs from 'qs'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  assertIsFoxEthStakingContractAddress,
  foxEthLpAssetId,
} from 'state/slices/opportunitiesSlice/constants'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxFarmingDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({ namespace: ['FoxFarmingDeposit:Deposit'] })

type DepositProps = StepComponentProps & {
  accountId?: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}
export const Deposit: React.FC<DepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const [lpTokenPrice, setLpTokenPrice] = useState<string | null>(null)
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { assetReference, contractAddress } = query
  const opportunity = state?.opportunity

  const asset = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetId ?? ''),
  )

  const filter = useMemo(
    () => ({ assetId: opportunity?.underlyingAssetId, accountId }),
    [accountId, opportunity?.underlyingAssetId],
  )
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByFilter(state, filter))

  const { getLpTokenPrice } = useFoxEthLiquidityPool(accountId)

  assertIsFoxEthStakingContractAddress(contractAddress)

  const {
    allowance: foxFarmingAllowance,
    getStakeGasData,
    getApproveGasData,
  } = useFoxFarming(contractAddress)

  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  if (!ethAsset) throw new Error(`Asset not found for AssetId ${ethAssetId}`)

  const marketData = useAppSelector(state => selectMarketDataById(state, foxEthLpAssetId))
  const rewardAsset = useAppSelector(state => selectAssetById(state, foxAssetId))

  // notify
  const toast = useToast()

  useEffect(() => {
    ;(async () => {
      const lpPrice = await getLpTokenPrice()
      if (lpPrice) setLpTokenPrice(lpPrice.toString())
    })()
  }, [getLpTokenPrice])

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (!(state && dispatch && state.userAddress && opportunity)) return

      const getDepositGasEstimate = async (deposit: DepositValues): Promise<string | undefined> => {
        if (!(state.userAddress && state.opportunity && assetReference)) return
        try {
          const gasData = await getStakeGasData(deposit.cryptoAmount)
          if (!gasData) return
          return bnOrZero(gasData.average.txFee).div(bn(10).pow(ethAsset.precision)).toPrecision()
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
      }

      // set deposit state for future use
      dispatch({ type: FoxFarmingDepositActionType.SET_DEPOSIT, payload: formValues })
      dispatch({ type: FoxFarmingDepositActionType.SET_LOADING, payload: true })
      try {
        if (!asset) return
        // Check if approval is required for user address
        const _allowance = await foxFarmingAllowance()
        const allowance = bnOrZero(_allowance).div(bn(10).pow(asset.precision))

        // Skip approval step if user allowance is greater than or equal requested deposit amount
        if (allowance.gte(formValues.cryptoAmount)) {
          const estimatedGasCrypto = await getDepositGasEstimate(formValues)
          if (!estimatedGasCrypto) return
          dispatch({
            type: FoxFarmingDepositActionType.SET_DEPOSIT,
            payload: { estimatedGasCrypto },
          })
          onNext(DefiStep.Confirm)
          dispatch({ type: FoxFarmingDepositActionType.SET_LOADING, payload: false })
        } else {
          const estimatedGasCrypto = await getApproveGasData()
          if (!estimatedGasCrypto) return
          dispatch({
            type: FoxFarmingDepositActionType.SET_APPROVE,
            payload: {
              estimatedGasCrypto: bnOrZero(estimatedGasCrypto.average.txFee)
                .div(bn(10).pow(ethAsset.precision))
                .toPrecision(),
            },
          })
          onNext(DefiStep.Approve)
          dispatch({ type: FoxFarmingDepositActionType.SET_LOADING, payload: false })
        }
      } catch (error) {
        moduleLogger.error({ fn: 'handleContinue', error }, 'Error on continue')
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
        dispatch({ type: FoxFarmingDepositActionType.SET_LOADING, payload: false })
      }
    },
    [
      asset,
      assetReference,
      dispatch,
      ethAsset.precision,
      foxFarmingAllowance,
      getApproveGasData,
      getStakeGasData,
      onNext,
      opportunity,
      state,
      toast,
      translate,
    ],
  )

  const cryptoHumanAmountAvailable = useMemo(
    () => bnOrZero(balance).div(bn(10).pow(asset?.precision ?? 1)),
    [asset?.precision, balance],
  )
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(cryptoHumanAmountAvailable).times(marketData?.price),
    [cryptoHumanAmountAvailable, marketData?.price],
  )

  const validateCryptoAmount = useCallback(
    (value: string) => {
      if (!asset) return
      const crypto = bnOrZero(balance).div(bn(10).pow(asset.precision))
      const _value = bnOrZero(value)
      const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [asset, balance],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      if (!asset) return
      const crypto = bnOrZero(balance).div(bn(10).pow(asset.precision))
      const fiat = crypto.times(marketData.price)
      const _value = bnOrZero(value)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [asset, balance, marketData.price],
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

  if (!state || !dispatch || !opportunity || !asset || !marketData) return null

  const handleCancel = browserHistory.goBack

  return (
    <ReusableDeposit
      accountId={accountId}
      asset={asset}
      rewardAsset={rewardAsset}
      inputIcons={opportunity?.icons}
      apy={String(opportunity?.apy)}
      cryptoAmountAvailable={cryptoHumanAmountAvailable.toPrecision()}
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
      onAccountIdChange={handleAccountIdChange}
      onContinue={handleContinue}
      onBack={handleBack}
      percentOptions={[0.25, 0.5, 0.75, 1]}
      enableSlippage={false}
      isLoading={state.loading || !lpTokenPrice}
    />
  )
}
