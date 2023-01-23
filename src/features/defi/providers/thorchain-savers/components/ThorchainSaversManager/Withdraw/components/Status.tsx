import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetById,
  selectFirstAccountIdByChainId,
  selectMarketDataById,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { ThorchainSaversWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

export const Status = () => {
  const translate = useTranslate()
  const { state, dispatch } = useContext(WithdrawContext)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId } = query

  const assetId = state?.opportunity?.assetId
  const feeAssetId = assetId

  const asset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))
  const marketData = useAppSelector(state => selectMarketDataById(state, feeAssetId ?? ''))

  const accountId = useAppSelector(state => selectFirstAccountIdByChainId(state, chainId))
  const userAddress = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])

  const serializedTxIndex = useMemo(() => {
    if (!(state?.txid && userAddress && accountId)) return ''
    return serializeTxIndex(accountId, state.txid, userAddress)
  }, [state?.txid, userAddress, accountId])
  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  useEffect(() => {
    if (confirmedTransaction && confirmedTransaction.status !== 'Pending' && dispatch) {
      dispatch({
        type: ThorchainSaversWithdrawActionType.SET_WITHDRAW,
        payload: {
          txStatus: confirmedTransaction.status === 'Confirmed' ? 'success' : 'failed',
          usedGasFee: confirmedTransaction.fee?.value,
        },
      })
    }
  }, [confirmedTransaction, dispatch])

  const handleViewPosition = useCallback(() => {
    browserHistory.push('/defi')
  }, [browserHistory])

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  if (!(state && asset)) return null

  const { statusIcon, statusText, statusBg, statusBody } = (() => {
    switch (state.withdraw.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='white' />,
          statusBg: 'green.500',
          statusBody: translate('modals.withdraw.status.success', {
            opportunity: `${asset.symbol} Vault`,
          }),
        }
      case 'failed':
        return {
          statusText: StatusTextEnum.failed,
          statusIcon: <CloseIcon color='white' />,
          statusBg: 'red.500',
          statusBody: translate('modals.withdraw.status.failed'),
        }
      default:
        return {
          statusIcon: <AssetIcon size='xs' src={asset?.icon} />,
          statusText: StatusTextEnum.pending,
          statusBg: 'transparent',
          statusBody: translate('modals.withdraw.status.pending'),
        }
    }
  })()

  return (
    <TxStatus
      onClose={handleCancel}
      onContinue={state.withdraw.txStatus === 'success' ? handleViewPosition : undefined}
      loading={!['success', 'failed'].includes(state.withdraw.txStatus)}
      continueText='modals.status.position'
      statusText={statusText}
      statusIcon={statusIcon}
      statusBg={statusBg}
      statusBody={statusBody}
    >
      <Summary spacing={0} mx={6} mb={4}>
        <Row variant='vert-gutter'>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset.icon} />
              <RawText>{asset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.cryptoAmount} symbol={asset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <HelperTooltip label={translate('defi.modals.saversVaults.estimatedFeeTooltip')}>
              <Text
                translation={
                  state.withdraw.txStatus === 'pending'
                    ? 'defi.modals.saversVaults.estimatedFee'
                    : 'defi.modals.saversVaults.fee'
                }
              />
            </HelperTooltip>
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.withdraw.withdrawFeeCryptoBaseUnit)
                  .div(bn(10).pow(asset.precision))
                  .times(marketData.price)
                  .toFixed()}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(state.withdraw.withdrawFeeCryptoBaseUnit)
                  .div(bn(10).pow(asset.precision))
                  .toFixed()}
                symbol={asset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <HelperTooltip label={translate('defi.modals.saversVaults.dustAmountTooltip')}>
              <Text translation='defi.modals.saversVaults.dustAmount' />
            </HelperTooltip>
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.withdraw.dustAmountCryptoBaseUnit)
                  .div(bn(10).pow(asset.precision))
                  .times(marketData.price)
                  .toFixed()}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(state.withdraw.dustAmountCryptoBaseUnit)
                  .div(bn(10).pow(asset.precision))
                  .toFixed()}
                symbol={asset.symbol}
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
            href={`${asset.explorerTxLink}${state.txid}`}
          >
            {translate('defi.viewOnChain')}
          </Button>
        </Row>
      </Summary>
    </TxStatus>
  )
}
