import { Alert, AlertIcon, Box, Stack, Tag, useToast } from '@chakra-ui/react'
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
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { DepositPath } from '../DepositCommon'
import { DepositContext } from '../DepositContext'
import { YearnDepositActionType } from '../DepositReducer'

export type YearnConfirmProps = {
  api: YearnVaultApi
}

export const Confirm = ({ api }: YearnConfirmProps) => {
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const appDispatch = useAppDispatch()
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, contractAddress: vaultAddress, tokenId } = query

  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  const assetCAIP19 = caip19.toCAIP19({ chain, network, assetNamespace, assetReference: tokenId })
  const feeAssetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace: AssetNamespace.Slip44,
    assetReference: AssetReference.Ethereum,
  })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetCAIP19))
  if (!marketData) appDispatch(marketApi.endpoints.findByCaip19.initiate(assetCAIP19))
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetCAIP19))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetCAIP19))
  const vaultCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: vaultAddress,
  })
  const vaultAsset = useAppSelector(state => selectAssetByCAIP19(state, vaultCAIP19))

  // user info
  const { state: walletState } = useWallet()

  // notify
  const toast = useToast()

  if (!state || !dispatch) return null

  const handleDeposit = async () => {
    try {
      if (!state.userAddress || !tokenId || !walletState.wallet) return
      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: true })
      const [txid, gasPrice] = await Promise.all([
        api.deposit({
          amountDesired: bnOrZero(state.deposit.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          tokenContractAddress: tokenId,
          userAddress: state.userAddress,
          vaultAddress,
          wallet: walletState.wallet,
        }),
        api.getGasPrice(),
      ])
      dispatch({ type: YearnDepositActionType.SET_TXID, payload: txid })
      history.push(DepositPath.Status)

      const transactionReceipt = await poll({
        fn: () => api.getTxReceipt({ txid }),
        validate: (result: TransactionReceipt) => !isNil(result),
        interval: 15000,
        maxAttempts: 30,
      })
      dispatch({
        type: YearnDepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: transactionReceipt.status === true ? 'success' : 'failed',
          usedGasFee: bnOrZero(gasPrice).times(transactionReceipt.gasUsed).toFixed(0),
        },
      })
    } catch (error) {
      console.error('YearnDeposit:handleDeposit error', error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: false })
    }
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  const apy = state.vault.metadata?.apy?.net_apy
  const annualYieldCrypto = bnOrZero(state.deposit?.cryptoAmount).times(bnOrZero(apy))
  const annualYieldFiat = annualYieldCrypto.times(marketData.price)

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      onConfirm={handleDeposit}
      loading={state.loading}
      loadingText={translate('common.confirmOnWallet')}
      headerText='modals.confirm.deposit.header'
      assets={[
        {
          ...asset,
          color: '#FF0000',
          cryptoAmount: state.deposit.cryptoAmount,
          fiatAmount: state.deposit.fiatAmount,
        },
        {
          ...vaultAsset,
          color: '#FFFFFF',
          cryptoAmount: bnOrZero(state.deposit.cryptoAmount)
            .div(bnOrZero(state.pricePerShare).div(`1e+${state.vault.decimals}`))
            .toString(),
          fiatAmount: state.deposit.fiatAmount,
        },
      ]}
    >
      <Stack spacing={4}>
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.withdrawFrom' />
          </Row.Label>
          <Row.Value fontWeight='bold'>
            <MiddleEllipsis address={state.userAddress || ''} />
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.depositTo' />
          </Row.Label>
          <Row.Value fontWeight='bold'>Yearn Finance</Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.estimatedGas' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.deposit.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(state.deposit.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .toFixed(5)}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.averageApy' />
          </Row.Label>
          <Row.Value>
            <Tag colorScheme='green'>
              <Amount.Percent value={String(apy)} />
            </Tag>
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.deposit.estimatedReturns' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat fontWeight='bold' value={annualYieldFiat.toFixed(2)} />
              <Amount.Crypto
                color='gray.500'
                value={annualYieldCrypto.toFixed(5)}
                symbol={asset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
        <Alert status='info' borderRadius='lg'>
          <AlertIcon />
          <Text translation='modals.confirm.deposit.preFooter' />
        </Alert>
      </Stack>
    </ReusableConfirm>
  )
}
