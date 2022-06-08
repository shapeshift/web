import { Alert, AlertIcon, Box, Stack, Tag, useToast } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { useContext } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DepositPath, YearnDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

export const Confirm = () => {
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { yearn: yearnInvestor } = useYearn()
  // TODO: Allow user to set fee priority
  const opportunity = state?.opportunity
  const { chainId, contractAddress: vaultAddress, assetReference } = query

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

  const vaultAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: vaultAddress,
  })
  const vaultAsset = useAppSelector(state => selectAssetById(state, vaultAssetId))

  // user info
  const { state: walletState } = useWallet()

  // notify
  const toast = useToast()

  if (!state || !dispatch) return null

  const handleDeposit = async () => {
    try {
      if (
        !(
          state.userAddress &&
          assetReference &&
          walletState.wallet &&
          supportsETH(walletState.wallet) &&
          opportunity
        )
      )
        return

      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: true })
      const yearnOpportunity = await yearnInvestor?.findByOpportunityId(
        state.opportunity?.positionAsset.assetId ?? '',
      )
      if (!yearnOpportunity) throw new Error('No opportunity')
      const tx = await yearnOpportunity.prepareDeposit({
        address: state.userAddress,
        amount: bnOrZero(state.deposit.cryptoAmount).times(`1e+${asset.precision}`).integerValue(),
      })
      const txid = await yearnOpportunity.signAndBroadcast({
        wallet: walletState.wallet,
        tx,
        // TODO: allow user to choose fee priority
        feePriority: undefined,
      })
      dispatch({ type: YearnDepositActionType.SET_TXID, payload: txid })
      history.push(DepositPath.Status)
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

  const apy = opportunity?.metadata?.apy?.net_apy
  const annualYieldCrypto = bnOrZero(state.deposit?.cryptoAmount).times(bnOrZero(apy))
  const annualYieldFiat = annualYieldCrypto.times(marketData.price)

  return (
    <ReusableConfirm
      onCancel={handleCancel}
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
          ...vaultAsset,
          color: '#FFFFFF',
          cryptoAmount: bnOrZero(state.deposit.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .div(bnOrZero(state.opportunity?.positionAsset.underlyingPerPosition))
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
