import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxyQuery } from 'features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import { useCallback, useContext } from 'react'
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
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

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

  if (!state) return null

  const { statusIcon, statusText, statusBg, statusBody } = (() => {
    // Safe Pending Tx
    if (
      maybeSafeTx?.isSafeTxHash &&
      !maybeSafeTx.transaction?.transactionHash &&
      maybeSafeTx.transaction?.confirmations &&
      maybeSafeTx.transaction.confirmations.length <= maybeSafeTx.transaction.confirmationsRequired
    )
      return {
        statusIcon: <AssetIcon size='xs' src={asset?.icon} justifyContent='center' />,
        statusText: StatusTextEnum.pending,
        statusBody: translate('modals.deposit.status.pending'),
        statusBg: 'transparent',
      }

    // Safe Success Tx
    if (maybeSafeTx?.transaction?.transactionHash) {
      return {
        statusText: StatusTextEnum.success,
        statusIcon: <CheckIcon color='white' />,
        statusBody: translate('modals.deposit.status.success', {
          opportunity: `${asset.name} Vault`,
        }),
        statusBg: 'green.500',
      }
    }

    switch (state.deposit.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='white' />,
          statusBody: translate('modals.deposit.status.success', {
            opportunity: `${asset.name} Vault`,
          }),
          statusBg: 'green.500',
        }
      case 'failed':
        return {
          statusText: StatusTextEnum.failed,
          statusIcon: <CloseIcon color='white' />,
          statusBody: translate('modals.deposit.status.failed'),
          statusBg: 'red.500',
        }
      default:
        return {
          statusIcon: <AssetIcon size='xs' src={asset?.icon} justifyContent='center' />,
          statusText: StatusTextEnum.pending,
          statusBody: translate('modals.deposit.status.pending'),
          statusBg: 'transparent',
        }
    }
  })()

  return (
    <TxStatus
      onClose={handleCancel}
      onContinue={state.deposit.txStatus === 'success' ? handleViewPosition : undefined}
      loading={!['success', 'failed'].includes(state.deposit.txStatus)}
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
                state.deposit.txStatus === 'pending'
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
                    ? state.deposit.estimatedGasCryptoBaseUnit
                    : state.deposit.usedGasFeeCryptoBaseUnit,
                )
                  .div(bn(10).pow(feeAsset.precision))
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(
                  state.deposit.txStatus === 'pending'
                    ? state.deposit.estimatedGasCryptoBaseUnit
                    : state.deposit.usedGasFeeCryptoBaseUnit,
                )
                  .div(bn(10).pow(feeAsset.precision))
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
            rightIcon={externalLinkIcon}
            href={`${asset.explorerTxLink}/${state.txid}`}
          >
            {translate('defi.viewOnChain')}
          </Button>
        </Row>
      </Summary>
    </TxStatus>
  )
}
