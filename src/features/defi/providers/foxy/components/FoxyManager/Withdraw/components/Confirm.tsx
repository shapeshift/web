import { Alert, AlertIcon, Box, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { WithdrawType } from '@shapeshiftoss/types'
import type { TransactionReceipt, TransactionReceiptParams } from 'ethers'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxyQuery } from 'features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import isNil from 'lodash/isNil'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'
import {
  selectBIP44ParamsByAccountId,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxyWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

export const Confirm: React.FC<StepComponentProps & { accountId?: AccountId | undefined }> = ({
  onNext,
  accountId,
}) => {
  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp({ isSigning: true })
  const { poll } = usePoll<TransactionReceipt | null>()
  const foxyApi = getFoxyApi()
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const { stakingAsset, underlyingAsset, contractAddress, feeMarketData, rewardId, feeAsset } =
    useFoxyQuery()

  // user info
  const { state: walletState } = useWallet()

  const withdrawalFee = useMemo(() => {
    return state?.withdraw.withdrawType === WithdrawType.INSTANT
      ? bnOrZero(
          bn(state?.withdraw.cryptoAmount ?? '0').times(state?.foxyFeePercentage ?? '0'),
        ).toString()
      : '0'
  }, [state?.withdraw.withdrawType, state?.withdraw.cryptoAmount, state?.foxyFeePercentage])

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId: accountId ?? '' }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )
  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const handleConfirm = useCallback(async () => {
    try {
      if (
        state?.loading ||
        !(
          state &&
          accountAddress &&
          rewardId &&
          walletState.wallet &&
          foxyApi &&
          dispatch &&
          bip44Params &&
          feeAsset
        )
      )
        return
      dispatch({ type: FoxyWithdrawActionType.SET_LOADING, payload: true })

      if (!supportsETH(walletState.wallet))
        throw new Error(`handleConfirm: wallet does not support ethereum`)

      await checkLedgerAppOpenIfLedgerConnected(feeAsset.chainId)

      const txid = await foxyApi.withdraw({
        tokenContractAddress: rewardId,
        userAddress: accountAddress,
        contractAddress,
        wallet: walletState.wallet,
        amountDesired: bnOrZero(state.withdraw.cryptoAmount)
          .times(bn(10).pow(underlyingAsset.precision))
          .decimalPlaces(0),
        type: state.withdraw.withdrawType,
        bip44Params,
      })
      dispatch({ type: FoxyWithdrawActionType.SET_TXID, payload: txid })
      onNext(DefiStep.Status)

      const transactionReceipt = await poll({
        fn: () => foxyApi.getTxReceipt({ txid }),
        validate: (result: TransactionReceipt | null) => !isNil(result),
        interval: 15000,
        maxAttempts: 30,
      })
      dispatch({
        type: FoxyWithdrawActionType.SET_WITHDRAW,
        payload: {
          txStatus: transactionReceipt?.status ? 'success' : 'failed',
          usedGasFeeCryptoBaseUnit: bnOrZero(
            // Types are drunk here, TransactionReceipt *does* implement TransactionReceiptParams but things are not narrowed down properly for some reason
            (transactionReceipt as TransactionReceiptParams | null)?.effectiveGasPrice?.toString(),
          )
            .times(bnOrZero(transactionReceipt?.gasUsed?.toString()))
            .toString(),
        },
      })
      dispatch({ type: FoxyWithdrawActionType.SET_LOADING, payload: false })
    } catch (error) {
      console.error(error)
    }
  }, [
    state,
    accountAddress,
    rewardId,
    walletState.wallet,
    foxyApi,
    dispatch,
    bip44Params,
    feeAsset,
    checkLedgerAppOpenIfLedgerConnected,
    contractAddress,
    underlyingAsset.precision,
    onNext,
    poll,
  ])

  const hasEnoughBalanceForGas = bnOrZero(feeAssetBalance)
    .minus(bnOrZero(state?.withdraw.estimatedGasCryptoBaseUnit).div(bn(10).pow(feeAsset.precision)))
    .gte(0)

  const handleCancel = useCallback(() => onNext(DefiStep.Info), [onNext])
  const notEnoughGasTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }],
    [feeAsset.symbol],
  )

  if (!state || !dispatch) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      headerText='modals.confirm.withdraw.header'
      onConfirm={handleConfirm}
      isDisabled={!hasEnoughBalanceForGas}
      loading={state.loading}
      loadingText={translate('common.confirm')}
    >
      <Summary>
        <Row variant='vert-gutter' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={stakingAsset.icon} />
              <RawText>{stakingAsset?.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.cryptoAmount} symbol={stakingAsset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <Text translation='modals.confirm.withdrawFee' />
          </Row.Label>
          <Row.Value fontWeight='bold'>{`${withdrawalFee} ${stakingAsset.symbol}`}</Row.Value>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <Text translation='modals.confirm.withdrawTime' />
          </Row.Label>
          <Row.Value fontWeight='bold'>
            <Text
              translation={
                state.withdraw.withdrawType === WithdrawType.INSTANT
                  ? 'modals.confirm.withdrawInstantTime'
                  : 'modals.confirm.withdrawDelayedTime'
              }
            />
          </Row.Value>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <Text translation='modals.confirm.estimatedGas' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.withdraw.estimatedGasCryptoBaseUnit)
                  .div(bn(10).pow(feeAsset.precision))
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state.withdraw.estimatedGasCryptoBaseUnit)
                  .div(bn(10).pow(feeAsset.precision))
                  .toFixed(5)}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Summary>
      {!hasEnoughBalanceForGas && (
        <Alert status='error' borderRadius='lg'>
          <AlertIcon />
          <Text translation={notEnoughGasTranslation} />
        </Alert>
      )}
    </ReusableConfirm>
  )
}
