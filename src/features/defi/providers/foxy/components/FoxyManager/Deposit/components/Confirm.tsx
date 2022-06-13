import { Alert, AlertIcon, Box, Stack, Tag, useToast } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { FoxyApi } from '@shapeshiftoss/investor-foxy'
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
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DepositPath, FoxyDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type FoxyConfirmProps = {
  api: FoxyApi
  apy: string
}

export const Confirm = ({ api, apy }: FoxyConfirmProps) => {
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference, rewardId } = query
  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))
  const contractAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: rewardId,
  })
  const contractAsset = useAppSelector(state => selectAssetById(state, contractAssetId))

  // user info
  const { state: walletState } = useWallet()

  // notify
  const toast = useToast()

  if (!state || !dispatch) return null

  const handleDeposit = async () => {
    try {
      if (!state.userAddress || !assetReference || !walletState.wallet) return
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: true })
      const [txid, gasPrice] = await Promise.all([
        api.deposit({
          amountDesired: bnOrZero(state.deposit.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          tokenContractAddress: assetReference,
          userAddress: state.userAddress,
          contractAddress,
          wallet: walletState.wallet,
        }),
        api.getGasPrice(),
      ])
      dispatch({ type: FoxyDepositActionType.SET_TXID, payload: txid })
      history.push(DepositPath.Status)

      const transactionReceipt = await poll({
        fn: () => api.getTxReceipt({ txid }),
        validate: (result: TransactionReceipt) => !isNil(result),
        interval: 15000,
        maxAttempts: 30,
      })
      dispatch({
        type: FoxyDepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: transactionReceipt.status === true ? 'success' : 'failed',
          usedGasFee: bnOrZero(gasPrice).times(transactionReceipt.gasUsed).toFixed(0),
        },
      })
    } catch (error) {
      console.error('FoxyDeposit:handleDeposit error', error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: false })
    }
  }

  const annualYieldCrypto = bnOrZero(state.deposit?.cryptoAmount).times(bnOrZero(apy))
  const annualYieldFiat = annualYieldCrypto.times(marketData.price)

  return (
    <ReusableConfirm
      onCancel={() => history.push('/')}
      onConfirm={handleDeposit}
      loading={state.loading}
      loadingText={translate('common.confirm')}
      headerText='modals.confirm.deposit.header'
      assets={[
        {
          ...asset,
          color: '#FF0000',
          cryptoAmount: state.deposit.cryptoAmount,
          fiatAmount: state.deposit.fiatAmount,
        },
        {
          ...contractAsset,
          color: '#FFFFFF',
          cryptoAmount: bnOrZero(state.deposit.cryptoAmount).div(bnOrZero(1).div(1)).toString(),
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
          <Row.Value fontWeight='bold'>
            <MiddleEllipsis address={state.foxyOpportunity.contractAddress || ''} />
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
