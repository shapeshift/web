import { Box, Stack } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { FoxyApi } from '@shapeshiftoss/investor-foxy'
import { WithdrawType } from '@shapeshiftoss/types'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import isNil from 'lodash/isNil'
import { useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { TransactionReceipt } from 'web3-core/types'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { poll } from 'lib/poll/poll'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxyWithdrawActionType, WithdrawPath } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type FoxyConfirmProps = {
  api: FoxyApi
}

export const Confirm = ({ api }: FoxyConfirmProps) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const history = useHistory()
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference, rewardId } = query

  const assetNamespace = 'erc20'
  // Asset info
  const underlyingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const underlyingAsset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
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
  const { state: walletState } = useWallet()

  const withdrawalFee = useMemo(() => {
    return state?.withdraw.withdrawType === WithdrawType.INSTANT
      ? bnOrZero(bn(state.withdraw.cryptoAmount).times(state.foxyFeePercentage)).toString()
      : '0'
  }, [state?.withdraw.withdrawType, state?.withdraw.cryptoAmount, state?.foxyFeePercentage])

  if (!state || !dispatch) return null

  const handleConfirm = async () => {
    try {
      if (!state.userAddress || !rewardId || !walletState.wallet || state.loading) return
      dispatch({ type: FoxyWithdrawActionType.SET_LOADING, payload: true })
      const [txid, gasPrice] = await Promise.all([
        api.withdraw({
          tokenContractAddress: rewardId,
          userAddress: state.userAddress,
          contractAddress,
          wallet: walletState.wallet,
          amountDesired: bnOrZero(state.withdraw.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          type: state.withdraw.withdrawType,
        }),
        api.getGasPrice(),
      ])
      dispatch({ type: FoxyWithdrawActionType.SET_TXID, payload: txid })
      history.push(WithdrawPath.Status)

      const transactionReceipt = await poll({
        fn: () => api.getTxReceipt({ txid }),
        validate: (result: TransactionReceipt) => !isNil(result),
        interval: 15000,
        maxAttempts: 30,
      })
      dispatch({
        type: FoxyWithdrawActionType.SET_WITHDRAW,
        payload: {
          txStatus: transactionReceipt.status ? 'success' : 'failed',
          usedGasFee: bnOrZero(bn(gasPrice).times(transactionReceipt.gasUsed)).toFixed(0),
        },
      })
      dispatch({ type: FoxyWithdrawActionType.SET_LOADING, payload: false })
    } catch (error) {
      console.error('FoxyWithdraw:handleConfirm error', error)
    }
  }

  return (
    <ReusableConfirm
      onCancel={() => history.push('/')}
      headerText='modals.confirm.withdraw.header'
      onConfirm={handleConfirm}
      loading={state.loading}
      loadingText={translate('common.confirm')}
      assets={[
        {
          ...asset,
          color: '#FFFFFF',
          cryptoAmount: state.withdraw.cryptoAmount,
          fiatAmount: state.withdraw.fiatAmount,
        },
        {
          ...underlyingAsset,
          color: '#FF0000',
          cryptoAmount: state.withdraw.cryptoAmount,
          fiatAmount: state.withdraw.fiatAmount,
        },
      ]}
    >
      <Stack spacing={6}>
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.withdrawTo' />
          </Row.Label>
          <Row.Value>
            <MiddleEllipsis address={state.userAddress || ''} />
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.withdrawFee' />
          </Row.Label>
          <Row.Value fontWeight='bold'>{`${withdrawalFee} Foxy`}</Row.Value>
        </Row>
        <Row>
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
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.estimatedGas' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.withdraw.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(state.withdraw.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .toFixed(5)}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Stack>
    </ReusableConfirm>
  )
}
