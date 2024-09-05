import { Box, Button, Center, Link, ModalBody, ModalFooter, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCheck, FaTimes } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { IconCircle } from 'components/IconCircle'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getTxLink } from 'lib/getTxLink'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectMarketDataByAssetIdUserCurrency,
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

type ClaimState = {
  txStatus: TxStatus
  usedGasFeeCryptoPrecision?: string
}

const StatusInfo = {
  [TxStatus.Pending]: {
    text: 'defi.broadcastingTransaction',
    color: 'blue.500',
    icon: undefined,
  },
  [TxStatus.Unknown]: {
    text: 'defi.broadcastingTransaction',
    color: 'blue.500',
    icon: undefined,
  },
  [TxStatus.Confirmed]: {
    text: 'defi.transactionComplete',
    color: 'green.500',
    icon: <FaCheck />,
  },
  [TxStatus.Failed]: {
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
    txStatus: TxStatus.Pending,
  })

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txid ?? undefined,
    accountId,
  })

  const isPendingSafeTx = useMemo(
    () =>
      maybeSafeTx?.isSafeTxHash &&
      !maybeSafeTx.transaction?.transactionHash &&
      maybeSafeTx.transaction?.confirmations &&
      maybeSafeTx.transaction.confirmations.length <= maybeSafeTx.transaction.confirmationsRequired,
    [maybeSafeTx],
  )

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
  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )
  const feeAssetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
  if (!feeAssetId) throw new Error(`Cannot get fee AssetId not found for ChainId ${chainId}`)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )

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

  const status = useMemo(() => {
    // SAFE Pending Tx
    if (isPendingSafeTx) {
      return TxStatus.Confirmed
    }

    // SAFE Success Tx
    if (maybeSafeTx?.transaction?.transactionHash) {
      return TxStatus.Confirmed
    }

    return confirmedTransaction?.status
  }, [confirmedTransaction?.status, isPendingSafeTx, maybeSafeTx?.transaction?.transactionHash])

  useEffect(() => {
    if (status && status !== TxStatus.Pending) {
      const usedGasFeeCryptoPrecision = (() => {
        if (maybeSafeTx?.transaction?.gasUsed)
          return fromBaseUnit(maybeSafeTx.transaction.gasUsed, feeAsset.precision)
        if (confirmedTransaction?.fee)
          return fromBaseUnit(confirmedTransaction.fee.value, feeAsset.precision)
        return '0'
      })()
      setState({
        txStatus: status,
        usedGasFeeCryptoPrecision,
      })
    }
  }, [
    confirmedTransaction,
    contractAddress,
    feeAsset.precision,
    maybeSafeTx?.transaction?.gasUsed,
    status,
  ])

  useEffect(() => {
    if (!opportunity || !asset) return
    if (state.txStatus === TxStatus.Confirmed) {
      trackOpportunityEvent(
        MixPanelEvent.ClaimSuccess,
        {
          opportunity,
          fiatAmounts: [claimFiatAmount],
          cryptoAmounts: [{ assetId: asset.assetId, amountCryptoHuman: amount }],
        },
        assets,
      )
    }
  }, [amount, asset, assets, claimFiatAmount, opportunity, state.txStatus])

  const handleClose = useCallback(() => browserHistory.goBack(), [browserHistory])

  const txLink = useMemo(() => {
    if (!feeAsset) return
    if (!txid) return

    if (maybeSafeTx?.transaction?.transactionHash)
      return getTxLink({
        txId: maybeSafeTx.transaction.transactionHash,
        defaultExplorerBaseUrl: feeAsset.explorerTxLink,
        accountId,
        // on-chain Tx
        isSafeTxHash: false,
      })

    return getTxLink({
      txId: txid,
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      accountId,
      isSafeTxHash: Boolean(maybeSafeTx?.isSafeTxHash),
    })
  }, [
    accountId,
    feeAsset,
    maybeSafeTx?.isSafeTxHash,
    maybeSafeTx?.transaction?.transactionHash,
    txid,
  ])

  const statusText = useMemo(() => {
    if (isPendingSafeTx)
      return translate('common.safeProposalQueued', {
        currentConfirmations: maybeSafeTx?.transaction?.confirmations?.length,
        confirmationsRequired: maybeSafeTx?.transaction?.confirmationsRequired,
      })

    return translate(
      state.txStatus === TxStatus.Pending
        ? 'defi.broadcastingTransaction'
        : 'defi.transactionComplete',
    )
  }, [
    isPendingSafeTx,
    maybeSafeTx?.transaction?.confirmations?.length,
    maybeSafeTx?.transaction?.confirmationsRequired,
    state.txStatus,
    translate,
  ])

  return (
    <SlideTransition>
      <ModalBody>
        <Center py={8} flexDirection='column'>
          <CircularProgress
            size='24'
            position='relative'
            thickness='4px'
            isIndeterminate={state.txStatus === TxStatus.Pending}
          >
            <Box position='absolute' top='50%' left='50%' transform='translate(-50%, -50%)'>
              {state.txStatus === TxStatus.Pending ? (
                <AssetIcon src={asset?.icon} boxSize='16' />
              ) : (
                <IconCircle bg={StatusInfo[state.txStatus].color} boxSize='16' color='white'>
                  {StatusInfo[state.txStatus].icon}
                </IconCircle>
              )}
            </Box>
          </CircularProgress>
          <RawText mt={6} fontWeight='medium'>
            {statusText}
          </RawText>
        </Center>
      </ModalBody>
      <ModalFooter>
        <Stack width='full' spacing={4}>
          <Row>
            <Row.Label>{translate('modals.status.transactionId')}</Row.Label>
            <Row.Value>
              <Link isExternal color='blue.500' href={txLink}>
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
              <InlineCopyButton value={userAddress}>
                <Link
                  isExternal
                  color='blue.500'
                  href={`${asset?.explorerAddressLink}${userAddress}`}
                >
                  <MiddleEllipsis value={userAddress} />
                </Link>
              </InlineCopyButton>
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>
              {translate(
                state.txStatus === TxStatus.Pending
                  ? 'modals.status.estimatedGas'
                  : 'modals.status.gasUsed',
              )}
            </Row.Label>
            <Row.Value>
              <Stack textAlign='right' spacing={0}>
                <Amount.Fiat
                  fontWeight='bold'
                  value={bnOrZero(
                    state.txStatus === TxStatus.Pending
                      ? estimatedGas
                      : state.usedGasFeeCryptoPrecision,
                  )
                    .times(feeMarketData.price)
                    .toFixed(2)}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={bnOrZero(
                    state.txStatus === TxStatus.Pending
                      ? estimatedGas
                      : state.usedGasFeeCryptoPrecision,
                  ).toFixed(5)}
                  symbol='ETH'
                />
              </Stack>
            </Row.Value>
          </Row>
          <Button width='full' size='lg' onClick={handleClose}>
            {translate('common.close')}
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
