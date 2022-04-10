import { Box, Stack } from '@chakra-ui/react'
import { AssetNamespace, AssetReference, caip19 } from '@shapeshiftoss/caip'
import { YearnVaultApi } from '@shapeshiftoss/investor-yearn'
import { NetworkTypes } from '@shapeshiftoss/types'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import isNil from 'lodash/isNil'
import { useContext } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { TransactionReceipt } from 'web3-core/types'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { poll } from 'lib/poll/poll'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { WithdrawPath } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'
import { YearnWithdrawActionType } from '../WithdrawReducer'

type YearnConfirmProps = {
  api: YearnVaultApi
}

export const Confirm = ({ api }: YearnConfirmProps) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const history = useHistory()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, contractAddress: vaultAddress, tokenId } = query

  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  // Asset info
  const underlyingAssetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: tokenId,
  })
  const underlyingAsset = useAppSelector(state => selectAssetByCAIP19(state, underlyingAssetCAIP19))
  const assetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: vaultAddress,
  })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const feeAssetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace: AssetNamespace.Slip44,
    assetReference: AssetReference.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetCAIP19))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetCAIP19))

  // user info
  const { state: walletState } = useWallet()

  if (!state || !dispatch) return null

  const handleConfirm = async () => {
    try {
      if (!state.userAddress || !tokenId || !walletState.wallet) return
      dispatch({ type: YearnWithdrawActionType.SET_LOADING, payload: true })
      const [txid, gasPrice] = await Promise.all([
        api.withdraw({
          tokenContractAddress: tokenId,
          userAddress: state.userAddress,
          vaultAddress,
          wallet: walletState.wallet,
          amountDesired: bnOrZero(state.withdraw.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
        }),
        api.getGasPrice(),
      ])
      dispatch({ type: YearnWithdrawActionType.SET_TXID, payload: txid })
      history.push(WithdrawPath.Status)

      const transactionReceipt = await poll({
        fn: () => api.getTxReceipt({ txid }),
        validate: (result: TransactionReceipt) => !isNil(result),
        interval: 15000,
        maxAttempts: 30,
      })
      dispatch({
        type: YearnWithdrawActionType.SET_WITHDRAW,
        payload: {
          txStatus: transactionReceipt.status === true ? 'success' : 'failed',
          usedGasFee: bnOrZero(gasPrice).times(transactionReceipt.gasUsed).toFixed(0),
        },
      })
      dispatch({ type: YearnWithdrawActionType.SET_LOADING, payload: false })
    } catch (error) {
      console.error('YearnWithdraw:handleConfirm error', error)
    }
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      headerText='modals.confirm.withdraw.header'
      loading={state.loading}
      loadingText={translate('common.confirmOnWallet')}
      onConfirm={handleConfirm}
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
          cryptoAmount: bnOrZero(state.withdraw.cryptoAmount)
            .times(bnOrZero(state.pricePerShare).div(`1e+${asset.precision}`))
            .toString(),
          fiatAmount: state.withdraw.fiatAmount,
        },
      ]}
    >
      <Stack spacing={6}>
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.withdrawFrom' />
          </Row.Label>
          <Row.Value fontWeight='bold'>
            <Text translation='defi.yearn' />
          </Row.Value>
        </Row>
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
