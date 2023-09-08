import { Box, Button, Center, Link, ModalBody, ModalFooter, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useEffect, useMemo, useState } from 'react'
import { FaCheck, FaTimes } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { IconCircle } from 'components/IconCircle'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectMarketDataById,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

interface ClaimStatusState {
  txid: string
  assetId: AssetId
  amount: string
  userAddress: string
  estimatedGas: string
  usedGasFeeCryptoPrecision?: string
  status: string
  chainId: ChainId
  contractAddress: string
}

enum TxStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

type ClaimState = {
  txStatus: TxStatus
  usedGasFeeCryptoPrecision?: string
}

const StatusInfo = {
  [TxStatus.PENDING]: {
    text: 'defi.broadcastingTransaction',
    color: 'blue.500',
  },
  [TxStatus.SUCCESS]: {
    text: 'defi.transactionComplete',
    color: 'green.500',
    icon: <FaCheck />,
  },
  [TxStatus.FAILED]: {
    text: 'defi.transactionFailed',
    color: 'red.500',
    icon: <FaTimes />,
  },
}

type ClaimStatusProps = { accountId: AccountId | undefined }

export const ClaimStatus: React.FC<ClaimStatusProps> = ({ accountId }) => {
  const { history: browserHistory } = useBrowserRouter()
  const translate = useTranslate()
  const {
    state: { txid, amount, assetId, userAddress, estimatedGas, chainId, contractAddress },
  } = useLocation<ClaimStatusState>()
  const [state, setState] = useState<ClaimState>({
    txStatus: TxStatus.PENDING,
  })

  const assets = useAppSelector(selectAssets)

  // Get Opportunity
  const opportunity = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, {
      userStakingId: serializeUserStakingId(
        accountId ?? '',
        toOpportunityId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: contractAddress,
        }),
      ),
    }),
  )

  // Asset Info
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const assetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const feeAssetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
  if (!feeAssetId) throw new Error(`Cannot get fee AssetId not found for ChainId ${chainId}`)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )

  const claimFiatAmount = useMemo(
    () => bnOrZero(amount).times(assetMarketData.price).toString(),
    [amount, assetMarketData.price],
  )

  const serializedTxIndex = useMemo(() => {
    if (!(txid && accountAddress && accountId)) return ''
    return serializeTxIndex(accountId, txid, accountAddress)
  }, [txid, accountAddress, accountId])
  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  useEffect(() => {
    if (confirmedTransaction && confirmedTransaction.status !== 'Pending') {
      setState({
        txStatus: confirmedTransaction.status === 'Confirmed' ? TxStatus.SUCCESS : TxStatus.FAILED,
        usedGasFeeCryptoPrecision: confirmedTransaction.fee
          ? bnOrZero(confirmedTransaction.fee.value).div(`1e${feeAsset.precision}`).toString()
          : '0',
      })
    }
  }, [confirmedTransaction, contractAddress, feeAsset.precision])

  useEffect(() => {
    if (!opportunity || !asset) return
    if (state.txStatus === TxStatus.SUCCESS) {
      trackOpportunityEvent(
        MixPanelEvents.ClaimSuccess,
        {
          opportunity,
          fiatAmounts: [claimFiatAmount],
          cryptoAmounts: [{ assetId: asset.assetId, amountCryptoHuman: amount }],
        },
        assets,
      )
    }
  }, [amount, asset, assets, claimFiatAmount, opportunity, state.txStatus])

  return (
    <SlideTransition>
      <ModalBody>
        <Center py={8} flexDirection='column'>
          <CircularProgress
            size='24'
            position='relative'
            thickness='4px'
            isIndeterminate={state.txStatus === TxStatus.PENDING}
          >
            <Box position='absolute' top='50%' left='50%' transform='translate(-50%, -50%)'>
              {state.txStatus === TxStatus.PENDING ? (
                <AssetIcon src={asset?.icon} boxSize='16' />
              ) : (
                <IconCircle bg={StatusInfo[state.txStatus].color} boxSize='16' color='white'>
                  {StatusInfo[state.txStatus].icon}
                </IconCircle>
              )}
            </Box>
          </CircularProgress>
          <RawText mt={6} fontWeight='medium'>
            {translate(
              state.txStatus === TxStatus.PENDING
                ? 'defi.broadcastingTransaction'
                : 'defi.transactionComplete',
            )}
          </RawText>
        </Center>
      </ModalBody>
      <ModalFooter>
        <Stack width='full' spacing={4}>
          <Row>
            <Row.Label>{translate('modals.status.transactionId')}</Row.Label>
            <Row.Value>
              <Link isExternal color='blue.500' href={`${asset?.explorerTxLink}${txid}`}>
                <MiddleEllipsis value={txid} />
              </Link>
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>{translate('defi.modals.claim.claimAmount')}</Row.Label>
            <Row.Value>
              <Amount.Crypto value={amount} symbol={asset?.symbol ?? ''} />
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>{translate('defi.modals.claim.claimToAddress')}</Row.Label>
            <Row.Value>
              <Link
                isExternal
                color='blue.500'
                href={`${asset?.explorerAddressLink}${userAddress}`}
              >
                <MiddleEllipsis value={userAddress} />
              </Link>
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>
              {translate(
                state.txStatus === TxStatus.PENDING
                  ? 'modals.status.estimatedGas'
                  : 'modals.status.gasUsed',
              )}
            </Row.Label>
            <Row.Value>
              <Stack textAlign='right' spacing={0}>
                <Amount.Fiat
                  fontWeight='bold'
                  value={bnOrZero(
                    state.txStatus === TxStatus.PENDING
                      ? estimatedGas
                      : state.usedGasFeeCryptoPrecision,
                  )
                    .times(feeMarketData.price)
                    .toFixed(2)}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={bnOrZero(
                    state.txStatus === TxStatus.PENDING
                      ? estimatedGas
                      : state.usedGasFeeCryptoPrecision,
                  ).toFixed(5)}
                  symbol='ETH'
                />
              </Stack>
            </Row.Value>
          </Row>
          <Button width='full' size='lg' onClick={() => browserHistory.goBack()}>
            {translate('common.close')}
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
