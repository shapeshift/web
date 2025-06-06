import { Box, Button, Center, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { FaCheck, FaTimes } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { TxStatus } from '../ClaimCommon'
import { ClaimContext } from '../ClaimContext'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { IconCircle } from '@/components/IconCircle'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { trackOpportunityEvent } from '@/lib/mixpanel/helpers'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import {
  selectAssetById,
  selectAssets,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

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

type StatusProps = {
  accountId: AccountId | undefined
}

export const Status: React.FC<StatusProps> = ({ accountId }) => {
  const { state, dispatch } = useContext(ClaimContext)
  const opportunity = state?.opportunity
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const navigate = useNavigate()
  const { chainId, assetReference } = query
  const translate = useTranslate()
  const assetNamespace = 'slip44'
  const assets = useAppSelector(selectAssets)
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  // Asset Info
  const asset = useAppSelector(state => selectAssetById(state, assetId)) // TODO: diff denom for rewards
  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  const userAddress: string | undefined = accountId && fromAccountId(accountId).account

  const rewardCryptoAmount = useMemo(
    () =>
      bnOrZero(opportunity?.rewardsCryptoBaseUnit?.amounts[0])
        .div(bn(10).pow(asset.precision))
        .toString(),
    [asset.precision, opportunity?.rewardsCryptoBaseUnit],
  )
  const rewardFiatAmount = useMemo(
    () =>
      bnOrZero(rewardCryptoAmount)
        .times(bnOrZero(assetMarketData?.price))
        .toString(),
    [assetMarketData?.price, rewardCryptoAmount],
  )

  const txStatus = useMemo(() => {
    if (!state) return TxStatus.PENDING
    if (state.txid) return TxStatus.SUCCESS
    return TxStatus.FAILED
  }, [state])

  useEffect(() => {
    if (!opportunity) return
    if (txStatus === TxStatus.SUCCESS) {
      trackOpportunityEvent(
        MixPanelEvent.ClaimSuccess,
        {
          opportunity,
          fiatAmounts: [rewardFiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoHuman: rewardCryptoAmount }],
        },
        assets,
      )
    }
  }, [assetId, assets, opportunity, rewardCryptoAmount, rewardFiatAmount, txStatus])

  const handleBack = useCallback(() => navigate(-1), [navigate])

  if (!state || !opportunity || !dispatch) return null

  return (
    <>
      <Center py={8} flexDirection='column'>
        <CircularProgress
          size='24'
          position='relative'
          thickness='4px'
          isIndeterminate={txStatus === TxStatus.PENDING}
        >
          <Box position='absolute' top='50%' left='50%' transform='translate(-50%, -50%)'>
            {txStatus === TxStatus.PENDING ? (
              <AssetIcon src={asset?.icon} boxSize='16' />
            ) : (
              <IconCircle bg={StatusInfo[txStatus].color} boxSize='16' color='white'>
                {StatusInfo[txStatus].icon}
              </IconCircle>
            )}
          </Box>
        </CircularProgress>
        <RawText mt={6} fontWeight='medium'>
          {translate(
            txStatus === TxStatus.PENDING
              ? 'defi.broadcastingTransaction'
              : 'defi.transactionComplete',
          )}
        </RawText>
      </Center>
      <Stack width='full' spacing={4}>
        {state.txid && (
          <Row>
            <Row.Label>{translate('modals.status.transactionId')}</Row.Label>
            <Row.Value>
              <Link isExternal color='blue.500' href={`${asset?.explorerTxLink}${state.txid}`}>
                <MiddleEllipsis value={state.txid} />
              </Link>
            </Row.Value>
          </Row>
        )}
        <Row>
          <Row.Label>{translate('defi.modals.claim.claimAmount')}</Row.Label>
          <Row.Value>
            <Amount.Crypto value={rewardCryptoAmount} symbol={asset?.symbol} />
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>{translate('defi.modals.claim.claimToAddress')}</Row.Label>
          <Row.Value>
            <InlineCopyButton value={userAddress ?? ''}>
              <Link
                isExternal
                color='blue.500'
                href={`${asset?.explorerAddressLink}${userAddress}`}
              >
                {userAddress && <MiddleEllipsis value={userAddress} />}
              </Link>
            </InlineCopyButton>
          </Row.Value>
        </Row>
        <Button width='full' size='lg' onClick={handleBack}>
          {translate('common.close')}
        </Button>
      </Stack>
    </>
  )
}
