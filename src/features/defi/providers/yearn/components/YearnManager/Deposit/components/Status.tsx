import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useContext, useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById, selectTxById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { YearnDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

export const Status = () => {
  const translate = useTranslate()
  const { state, dispatch } = useContext(DepositContext)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId } = query

  const assetId = state?.opportunity?.underlyingAsset.assetId || 'undefined'

  // TODO: We need to get the fee asset from the Opportunity
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, state?.txid || 'undefined'))

  useEffect(() => {
    if (confirmedTransaction && confirmedTransaction.status !== 'pending' && dispatch) {
      dispatch({
        type: YearnDepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: confirmedTransaction.status === 'confirmed' ? 'success' : 'failed',
          usedGasFee: confirmedTransaction.fee?.value,
        },
      })
    }
  }, [confirmedTransaction, dispatch])

  const handleViewPosition = () => {
    browserHistory.push('/defi')
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  if (!state) return null

  let statusIcon: React.ReactElement = <AssetIcon size='xs' src={asset.icon} />
  let statusText = StatusTextEnum.pending
  if (state.deposit.txStatus === 'success') {
    statusText = StatusTextEnum.success
    statusIcon = <CheckIcon color='green' />
  }
  if (state.deposit.txStatus === 'failed') {
    statusText = StatusTextEnum.failed
    statusIcon = <CloseIcon color='red' />
  }

  return (
    <TxStatus
      onClose={handleCancel}
      onContinue={state.deposit.txStatus === 'success' ? handleViewPosition : undefined}
      loading={state.loading}
      statusText={statusText}
      statusIcon={statusIcon}
      continueText='modals.status.position'
    >
      <Summary spacing={0} mx={6} mb={4}>
        <Row variant='vert-gutter'>
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
        <Row variant='gutter'>
          <Row.Label>
            <Text
              translation={
                state.deposit.txStatus === 'pending'
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
                  state.deposit.txStatus === 'pending'
                    ? state.deposit.estimatedGasCrypto
                    : state.deposit.usedGasFee,
                )
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(
                  state.deposit.txStatus === 'pending'
                    ? state.deposit.estimatedGasCrypto
                    : state.deposit.usedGasFee,
                )
                  .div(`1e+${feeAsset.precision}`)
                  .toFixed(5)}
                symbol='ETH'
              />
            </Box>
          </Row.Value>
        </Row>
        <Row variant='gutter'>
          <Button
            as={Link}
            width='full'
            isExternal
            variant='ghost-filled'
            colorScheme='green'
            rightIcon={<ExternalLinkIcon />}
            hrer={`${asset.explorerTxLink}/${state.txid}`}
          >
            {translate('defi.viewOnChain')}
          </Button>
        </Row>
      </Summary>
    </TxStatus>
  )
}
