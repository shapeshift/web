import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { WithdrawType } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus as TransactionStatus } from 'features/defi/components/TxStatus/TxStatus'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxyQuery } from 'features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getTxLink } from 'lib/getTxLink'

import { WithdrawContext } from '../WithdrawContext'

type StatusProps = { accountId: AccountId | undefined }

const externalLinkIcon = <ExternalLinkIcon />

export const Status: React.FC<StatusProps> = ({ accountId }) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const { history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { stakingAsset, underlyingAsset, feeAsset, feeMarketData } = useFoxyQuery()

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: state?.txid ?? undefined,
    accountId,
  })

  const userAddress: string | undefined = accountId && fromAccountId(accountId).account

  const withdrawalFee = useMemo(() => {
    return state?.withdraw.withdrawType === WithdrawType.INSTANT
      ? bnOrZero(bn(state.withdraw.cryptoAmount).times(state.foxyFeePercentage)).toString()
      : '0'
  }, [state?.withdraw.withdrawType, state?.withdraw.cryptoAmount, state?.foxyFeePercentage])

  const handleViewPosition = useCallback(() => {
    browserHistory.push('/earn')
  }, [browserHistory])

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const { statusIcon, status, statusText, statusBg, statusBody } = useMemo(() => {
    // Safe Pending Tx
    if (maybeSafeTx?.isQueuedSafeTx)
      return {
        statusIcon: <AssetIcon size='xs' src={underlyingAsset?.icon} justifyContent='center' />,
        status: TxStatus.Pending,
        statusBg: 'transparent',
        statusText: StatusTextEnum.pending,
        statusBody: translate('common.safeProposalQueued', {
          currentConfirmations: maybeSafeTx?.transaction?.confirmations?.length,
          confirmationsRequired: maybeSafeTx?.transaction?.confirmationsRequired,
        }),
      }

    if (maybeSafeTx?.isExecutedSafeTx) {
      return {
        statusText: StatusTextEnum.success,
        status: TxStatus.Confirmed,
        statusIcon: <CheckIcon color='white' />,
        statusBg: 'green.500',
        statusBody: translate('modals.withdraw.status.success', {
          opportunity: `${stakingAsset.symbol} Vault`,
        }),
      }
    }

    switch (state?.withdraw.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          status: TxStatus.Confirmed,
          statusIcon: <CheckIcon color='white' />,
          statusBg: 'green.500',
          statusBody: translate('modals.withdraw.status.success', {
            opportunity: `${stakingAsset.symbol} Vault`,
          }),
        }
      case 'failed':
        return {
          statusText: StatusTextEnum.failed,
          status: TxStatus.Failed,
          statusIcon: <CloseIcon color='white' />,
          statusBg: 'red.500',
          statusBody: translate('modals.withdraw.status.failed'),
        }
      default:
        return {
          statusIcon: <AssetIcon size='xs' src={underlyingAsset?.icon} justifyContent='center' />,
          status: TxStatus.Pending,
          statusText: StatusTextEnum.pending,
          statusBg: 'transparent',
          statusBody: translate('modals.withdraw.status.pending'),
        }
    }
  }, [
    maybeSafeTx?.isExecutedSafeTx,
    maybeSafeTx?.isQueuedSafeTx,
    maybeSafeTx?.transaction?.confirmations?.length,
    maybeSafeTx?.transaction?.confirmationsRequired,
    stakingAsset.symbol,
    state?.withdraw.txStatus,
    translate,
    underlyingAsset?.icon,
  ])

  const txLink = useMemo(() => {
    if (!feeAsset) return
    if (!state?.txid) return

    if (maybeSafeTx?.transaction?.transactionHash)
      return getTxLink({
        txId: maybeSafeTx.transaction.transactionHash,
        defaultExplorerBaseUrl: feeAsset.explorerTxLink,
        accountId,
        // on-chain Tx
        isSafeTxHash: false,
      })

    return getTxLink({
      txId: state?.txid ?? undefined,
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      accountId,
      isSafeTxHash: Boolean(maybeSafeTx?.isSafeTxHash),
    })
  }, [accountId, feeAsset, maybeSafeTx, state?.txid])

  const usedGasOrEstimateCryptoPrecision = useMemo(() => {
    if (maybeSafeTx?.transaction?.gasUsed)
      return fromBaseUnit(maybeSafeTx.transaction.gasUsed, feeAsset.precision)
    if (state?.withdraw.usedGasFeeCryptoBaseUnit)
      return fromBaseUnit(state.withdraw.usedGasFeeCryptoBaseUnit, feeAsset.precision)
    return fromBaseUnit(state?.withdraw.estimatedGasCryptoBaseUnit ?? '0', feeAsset.precision)
  }, [
    feeAsset.precision,
    maybeSafeTx?.transaction?.gasUsed,
    state?.withdraw.estimatedGasCryptoBaseUnit,
    state?.withdraw.usedGasFeeCryptoBaseUnit,
  ])

  if (!state || !dispatch) return null

  return (
    <TransactionStatus
      onClose={handleCancel}
      onContinue={status === TxStatus.Confirmed ? handleViewPosition : undefined}
      loading={![TxStatus.Confirmed, TxStatus.Failed].includes(status)}
      continueText='modals.status.position'
      statusText={statusText}
      statusBg={statusBg}
      statusIcon={statusIcon}
      statusBody={statusBody}
    >
      <Summary spacing={0} mx={6} mb={4}>
        <Row variant='vert-gutter'>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={stakingAsset.icon} />
              <RawText>{stakingAsset.name}</RawText>
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
          <Row.Value fontWeight='bold'>{`${withdrawalFee} Foxy`}</Row.Value>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <Text translation='modals.confirm.withdrawTo' />
          </Row.Label>
          <Row.Value fontWeight='bold'>
            <MiddleEllipsis value={userAddress || ''} />
          </Row.Value>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <Text
              translation={
                status === TxStatus.Pending ? 'modals.status.estimatedGas' : 'modals.status.gasUsed'
              }
            />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(usedGasOrEstimateCryptoPrecision)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(usedGasOrEstimateCryptoPrecision).toFixed(5)}
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
            rightIcon={externalLinkIcon}
            href={txLink}
          >
            {translate('defi.viewOnChain')}
          </Button>
        </Row>
      </Summary>
    </TransactionStatus>
  )
}
