import { ArrowForwardIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { Box, Link, Stack } from '@chakra-ui/react'
import { AssetNamespace, AssetReference, caip19 } from '@shapeshiftoss/caip'
import { NetworkTypes } from '@shapeshiftoss/types'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useContext } from 'react'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { WithdrawContext } from '../WithdrawContext'

export const Status = () => {
  const { state } = useContext(WithdrawContext)
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

  const handleViewPosition = () => {
    browserHistory.push('/defi')
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  if (!state) return null

  let statusIcon: React.ReactElement = <ArrowForwardIcon />
  let statusText = StatusTextEnum.pending
  if (state.withdraw.txStatus === 'success') {
    statusText = StatusTextEnum.success
    statusIcon = <CheckIcon color='green' />
  }
  if (state.withdraw.txStatus === 'failed') {
    statusText = StatusTextEnum.failed
    statusIcon = <CloseIcon color='red' />
  }

  return (
    <TxStatus
      onClose={handleCancel}
      onContinue={handleViewPosition}
      loading={state.loading}
      continueText='modals.status.position'
      closeText='modals.status.close'
      statusText={statusText}
      statusIcon={statusIcon}
      assets={[
        {
          ...asset,
          cryptoAmount: state.withdraw.cryptoAmount,
          fiatAmount: state.withdraw.fiatAmount,
        },
        {
          ...underlyingAsset,
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
            <Text translation='modals.status.transactionId' />
          </Row.Label>
          <Row.Value>
            <Link
              href={`${asset.explorerTxLink}/${state.txid}`}
              isExternal
              color='blue.500'
              fontWeight='bold'
            >
              <MiddleEllipsis address={state.txid || ''} />
            </Link>
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.withdrawFrom' />
          </Row.Label>
          <Row.Value fontWeight='bold'>Yearn Finance</Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.withdrawTo' />
          </Row.Label>
          <Row.Value fontWeight='bold'>
            <MiddleEllipsis address={state.userAddress || ''} />
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text
              translation={
                state.withdraw.txStatus === 'pending'
                  ? 'modals.status.estimatedGas'
                  : 'modals.status.gasUsed'
              }
            />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(
                  state.withdraw.txStatus === 'pending'
                    ? state.withdraw.estimatedGasCrypto
                    : state.withdraw.usedGasFee,
                )
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(
                  state.withdraw.txStatus === 'pending'
                    ? state.withdraw.estimatedGasCrypto
                    : state.withdraw.usedGasFee,
                )
                  .div(`1e+${feeAsset.precision}`)
                  .toFixed(5)}
                symbol='ETH'
              />
            </Box>
          </Row.Value>
        </Row>
      </Stack>
    </TxStatus>
  )
}
