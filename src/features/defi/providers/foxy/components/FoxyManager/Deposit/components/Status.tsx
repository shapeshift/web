import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus as TransactionStatus } from 'features/defi/components/TxStatus/TxStatus'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxyQuery } from 'features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'

import { DepositContext } from '../DepositContext'

const externalLinkIcon = <ExternalLinkIcon />

type StatusProps = StepComponentProps & { accountId: AccountId | undefined }

export const Status: React.FC<StatusProps> = ({ accountId }) => {
  const translate = useTranslate()
  const { state } = useContext(DepositContext)
  const history = useHistory()
  const { history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { stakingAsset: asset, feeAsset, feeMarketData } = useFoxyQuery()

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: state?.txid ?? undefined,
    accountId,
  })

  const handleViewPosition = useCallback(() => {
    browserHistory.push('/earn')
  }, [browserHistory])

  const handleCancel = history.goBack

  const { statusIcon, status, statusText, statusBg, statusBody } = useMemo(() => {
    if (maybeSafeTx?.isQueuedSafeTx)
      return {
        statusIcon: <AssetIcon size='xs' src={asset?.icon} justifyContent='center' />,
        status: TxStatus.Pending,
        statusText: StatusTextEnum.pending,
        statusBody: translate('common.safeProposalQueued', {
          currentConfirmations: maybeSafeTx.transaction?.confirmations?.length,
          confirmationsRequired: maybeSafeTx.transaction?.confirmationsRequired,
        }),
        statusBg: 'transparent',
      }

    if (maybeSafeTx?.transaction?.transactionHash) {
      return {
        statusText: StatusTextEnum.success,
        status: TxStatus.Confirmed,
        statusIcon: <CheckIcon color='white' />,
        statusBody: translate('modals.deposit.status.success', {
          opportunity: `${asset.name} Vault`,
        }),
        statusBg: 'green.500',
      }
    }

    switch (state?.deposit.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          status: TxStatus.Confirmed,
          statusIcon: <CheckIcon color='white' />,
          statusBody: translate('modals.deposit.status.success', {
            opportunity: `${asset.name} Vault`,
          }),
          statusBg: 'green.500',
        }
      case 'failed':
        return {
          statusText: StatusTextEnum.failed,
          status: TxStatus.Failed,
          statusIcon: <CloseIcon color='white' />,
          statusBody: translate('modals.deposit.status.failed'),
          statusBg: 'red.500',
        }
      default:
        return {
          statusIcon: <AssetIcon size='xs' src={asset?.icon} justifyContent='center' />,
          status: TxStatus.Pending,
          statusText: StatusTextEnum.pending,
          statusBody: translate('modals.deposit.status.pending'),
          statusBg: 'transparent',
        }
    }
  }, [
    asset?.icon,
    asset.name,
    maybeSafeTx?.isQueuedSafeTx,
    maybeSafeTx?.transaction?.confirmations?.length,
    maybeSafeTx?.transaction?.confirmationsRequired,
    maybeSafeTx?.transaction?.transactionHash,
    state?.deposit.txStatus,
    translate,
  ])

  const txLink = useMemo(() => {
    if (!feeAsset) return
    if (!state?.txid) return

    return getTxLink({
      txId: state?.txid ?? undefined,
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      accountId,
      maybeSafeTx,
    })
  }, [accountId, feeAsset, maybeSafeTx, state?.txid])

  const usedGasOrEstimateCryptoPrecision = useMemo(() => {
    if (maybeSafeTx?.transaction?.gasUsed)
      return fromBaseUnit(maybeSafeTx.transaction.gasUsed, feeAsset.precision)
    if (state?.deposit.usedGasFeeCryptoBaseUnit)
      return fromBaseUnit(state.deposit.usedGasFeeCryptoBaseUnit, feeAsset.precision)
    return fromBaseUnit(state?.deposit.estimatedGasCryptoBaseUnit, feeAsset.precision)
  }, [
    feeAsset.precision,
    maybeSafeTx?.transaction?.gasUsed,
    state?.deposit.estimatedGasCryptoBaseUnit,
    state?.deposit.usedGasFeeCryptoBaseUnit,
  ])

  if (!state) return null

  return (
    <TransactionStatus
      onClose={handleCancel}
      onContinue={status === TxStatus.Confirmed ? handleViewPosition : undefined}
      loading={![TxStatus.Confirmed, TxStatus.Failed].includes(status)}
      statusText={statusText}
      statusIcon={statusIcon}
      statusBg={statusBg}
      statusBody={statusBody}
      continueText='modals.status.position'
    >
      <Summary mx={4} mb={4}>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text
              translation={
                status === TxStatus.Pending
                  ? 'modals.confirm.amountToDeposit'
                  : 'modals.confirm.amountDeposited'
              }
            />
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
