import { Alert, AlertDescription, AlertIcon, useColorModeValue, useToast } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import { useCallback, useContext, useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { poll } from 'lib/poll/poll'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxFarmingWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'FoxFarming', 'Withdraw', 'Approve'],
})

export const Approve = ({ onNext }: StepComponentProps) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const alertText = useColorModeValue('blue.800', 'white')
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, rewardId } = query
  const opportunity = state?.opportunity
  const { allowance, approve, getUnstakeGasData } = useFoxFarming(contractAddress)
  const toast = useToast()

  const assetNamespace = 'erc20'
  // Asset info
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: rewardId,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  // user info
  const {
    state: { wallet },
  } = useWallet()

  const feeAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByAssetId(state, { assetId: feeAsset?.assetId ?? '' }),
  )
  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(feeAssetBalance)
        .minus(bnOrZero(state?.approve.estimatedGasCrypto).div(`1e+${feeAsset.precision}`))
        .gte(0),
    [feeAsset.precision, feeAssetBalance, state?.approve.estimatedGasCrypto],
  )

  const handleApprove = useCallback(async () => {
    if (!dispatch || !opportunity || !wallet || !supportsETH(wallet)) return

    try {
      dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: true })
      await approve()
      await poll({
        fn: () => allowance(),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(bn(10).pow(asset.precision))
          return bnOrZero(allowance).gte(bnOrZero(state.withdraw.lpAmount))
        },
        interval: 15000,
        maxAttempts: 30,
      })
      // Get withdraw gas estimate
      const gasData = await getUnstakeGasData(state.withdraw.lpAmount, state.withdraw.isExiting)
      if (!gasData) return
      const estimatedGasCrypto = bnOrZero(gasData.average.txFee)
        .div(bn(10).pow(feeAsset.precision))
        .toPrecision()
      dispatch({
        type: FoxFarmingWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedGasCrypto },
      })

      onNext(DefiStep.Confirm)
    } catch (error) {
      moduleLogger.error({ fn: 'handleApprove', error }, 'Error getting approval gas estimate')
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
    }
  }, [
    allowance,
    approve,
    asset.precision,
    dispatch,
    feeAsset.precision,
    getUnstakeGasData,
    onNext,
    opportunity,
    state?.withdraw.lpAmount,
    state?.withdraw.isExiting,
    toast,
    translate,
    wallet,
  ])

  const preFooter = useMemo(
    () => (
      <>
        <Alert status='info' borderRadius='lg' color='blue.500'>
          <FaGasPump />
          <AlertDescription textAlign='left' ml={3} color={alertText}>
            {translate('modals.withdraw.withdrawFee')}
          </AlertDescription>
        </Alert>
        {!hasEnoughBalanceForGas && (
          <Alert status='error' borderRadius='lg'>
            <AlertIcon />
            <Text
              translation={['modals.withdraw.notEnoughGas', { assetSymbol: feeAsset.symbol }]}
            />
          </Alert>
        )}
      </>
    ),
    [alertText, feeAsset.symbol, hasEnoughBalanceForGas, translate],
  )

  if (!state || !dispatch || !opportunity) return null

  return (
    <ReusableApprove
      asset={asset}
      feeAsset={feeAsset}
      cryptoEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto).toFixed(5)}
      disabled={!hasEnoughBalanceForGas}
      fiatEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto)
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approve')}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      preFooter={preFooter}
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleApprove}
      contractAddress={contractAddress}
    />
  )
}
