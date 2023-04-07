import { Alert, AlertIcon, Box, Stack, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxyQuery } from 'features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import isNil from 'lodash/isNil'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { TransactionReceipt } from 'web3-core/types'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { poll } from 'lib/poll/poll'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'
import {
  selectBIP44ParamsByAccountId,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxyDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Foxy', 'Deposit', 'Confirm'],
})

type ConfirmProps = StepComponentProps & { accountId: AccountId | undefined }

export const Confirm: React.FC<ConfirmProps> = ({ onNext, accountId }) => {
  const foxyApi = getFoxyApi()
  const { state, dispatch } = useContext(DepositContext)
  const translate = useTranslate()
  const {
    stakingAssetReference: assetReference,
    feeMarketData,
    contractAddress,
    stakingAsset: asset,
    feeAsset,
  } = useFoxyQuery()

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  // user info
  const { state: walletState } = useWallet()

  // notify
  const toast = useToast()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId: accountId ?? '' }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const handleDeposit = useCallback(async () => {
    if (
      !(
        accountAddress &&
        assetReference &&
        walletState.wallet &&
        foxyApi &&
        bip44Params &&
        dispatch
      )
    )
      return
    try {
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: true })
      const [txid, gasPrice] = await Promise.all([
        foxyApi.deposit({
          amountDesired: bnOrZero(state?.deposit.cryptoAmount)
            .times(bn(10).pow(asset.precision))
            .decimalPlaces(0),
          tokenContractAddress: assetReference,
          userAddress: accountAddress,
          contractAddress,
          wallet: walletState.wallet,
          bip44Params,
        }),
        foxyApi.getGasPrice(),
      ])
      dispatch({ type: FoxyDepositActionType.SET_TXID, payload: txid })
      onNext(DefiStep.Status)

      const transactionReceipt = await poll({
        fn: () => foxyApi.getTxReceipt({ txid }),
        validate: (result: TransactionReceipt) => !isNil(result),
        interval: 15000,
        maxAttempts: 30,
      })
      dispatch({
        type: FoxyDepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: transactionReceipt.status === true ? 'success' : 'failed',
          usedGasFeeCryptoBaseUnit: bnOrZero(gasPrice).times(transactionReceipt.gasUsed).toFixed(0),
        },
      })
    } catch (error) {
      moduleLogger.error(error, { fn: 'handleDeposit' }, 'handleDeposit error')
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: false })
    }
  }, [
    foxyApi,
    asset.precision,
    assetReference,
    bip44Params,
    contractAddress,
    dispatch,
    onNext,
    state?.deposit.cryptoAmount,
    accountAddress,
    toast,
    translate,
    walletState.wallet,
  ])

  if (!state || !dispatch) return null

  const hasEnoughBalanceForGas = bnOrZero(feeAssetBalance)
    .minus(bnOrZero(state.deposit.estimatedGasCryptoBaseUnit).div(bn(10).pow(feeAsset.precision)))
    .gte(0)

  return (
    <ReusableConfirm
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleDeposit}
      loading={state.loading}
      loadingText={translate('common.confirm')}
      isDisabled={!hasEnoughBalanceForGas}
      headerText='modals.confirm.deposit.header'
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToDeposit' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset.icon} />
              <RawText>{asset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.deposit.cryptoAmount} symbol={asset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row p={4}>
          <Row.Label>
            <Text translation='modals.confirm.estimatedGas' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.deposit.estimatedGasCryptoBaseUnit)
                  .div(bn(10).pow(feeAsset.precision))
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(state.deposit.estimatedGasCryptoBaseUnit)
                  .div(bn(10).pow(feeAsset.precision))
                  .toFixed(5)}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Summary>
      <Alert status='info' borderRadius='lg'>
        <AlertIcon />
        <Text translation='modals.confirm.deposit.preFooter' />
      </Alert>
      {!hasEnoughBalanceForGas && (
        <Alert status='error' borderRadius='lg'>
          <AlertIcon />
          <Text translation={['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }]} />
        </Alert>
      )}
    </ReusableConfirm>
  )
}
