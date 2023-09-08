import { Box, Button, Center, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useContext, useEffect, useMemo } from 'react'
import { FaCheck, FaTimes } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { IconCircle } from 'components/IconCircle'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { selectAssetById, selectAssets, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { TxStatus } from '../ClaimCommon'
import { ClaimContext } from '../ClaimContext'

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
  const { query, history } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference } = query
  const translate = useTranslate()
  const assetNamespace = 'slip44'
  const assets = useAppSelector(selectAssets)
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  // Asset Info
  const asset = useAppSelector(state => selectAssetById(state, assetId)) // TODO: diff denom for rewards
  const assetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
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
    () => bnOrZero(rewardCryptoAmount).times(assetMarketData.price).toString(),
    [assetMarketData.price, rewardCryptoAmount],
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
        MixPanelEvents.ClaimSuccess,
        {
          opportunity,
          fiatAmounts: [rewardFiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoHuman: rewardCryptoAmount }],
        },
        assets,
      )
    }
  }, [assetId, assets, opportunity, rewardCryptoAmount, rewardFiatAmount, txStatus])

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
            <Link isExternal color='blue.500' href={`${asset?.explorerAddressLink}${userAddress}`}>
              {userAddress && <MiddleEllipsis value={userAddress} />}
            </Link>
          </Row.Value>
        </Row>
        <Button width='full' size='lg' onClick={() => history.goBack()}>
          {translate('common.close')}
        </Button>
      </Stack>
    </>
  )
}
