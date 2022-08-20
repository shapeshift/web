import { Box, Button, Center, Link, Stack } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useContext, useEffect } from 'react'
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
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CosmosClaimActionType, TxStatus } from '../ClaimCommon'
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

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Cosmos', 'ClaimStatus'],
})

export const Status = () => {
  const { state, dispatch } = useContext(ClaimContext)
  const opportunity = state?.opportunity
  const { query, history } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference } = query
  const translate = useTranslate()
  const assetNamespace = 'slip44'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  // Asset Info
  const asset = useAppSelector(state => selectAssetById(state, assetId)) // TODO: diff denom for rewards

  useEffect(() => {
    ;(async () => {
      if (!state || !dispatch) return
      try {
        dispatch({
          type: CosmosClaimActionType.SET_CLAIM,
          payload: { txStatus: state.txid ? TxStatus.SUCCESS : TxStatus.FAILED },
        })
      } catch (error) {
        moduleLogger.error(error, 'ClaimStatus error')
        dispatch({
          type: CosmosClaimActionType.SET_CLAIM,
          payload: { txStatus: TxStatus.FAILED },
        })
      }
    })()
  }, [dispatch, state])

  if (!state || !opportunity || !dispatch) return null

  return (
    <>
      <Center py={8} flexDirection='column'>
        <CircularProgress
          size='24'
          position='relative'
          thickness='4px'
          isIndeterminate={state.claim.txStatus === TxStatus.PENDING}
        >
          <Box position='absolute' top='50%' left='50%' transform='translate(-50%, -50%)'>
            {state.claim.txStatus === TxStatus.PENDING ? (
              <AssetIcon src={asset?.icon} boxSize='16' />
            ) : (
              <IconCircle bg={StatusInfo[state.claim.txStatus].color} boxSize='16' color='white'>
                {StatusInfo[state.claim.txStatus].icon}
              </IconCircle>
            )}
          </Box>
        </CircularProgress>
        <RawText mt={6} fontWeight='medium'>
          {translate(
            state.claim.txStatus === TxStatus.PENDING
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
                <MiddleEllipsis address={state.txid} />
              </Link>
            </Row.Value>
          </Row>
        )}
        <Row>
          <Row.Label>{translate('defi.modals.claim.claimAmount')}</Row.Label>
          <Row.Value>
            <Amount.Crypto
              value={bnOrZero(opportunity.rewards).div(`1e+${asset.precision}`).toString()}
              symbol={asset?.symbol}
            />
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>{translate('defi.modals.claim.claimToAddress')}</Row.Label>
          <Row.Value>
            <Link
              isExternal
              color='blue.500'
              href={`${asset?.explorerAddressLink}${state.userAddress}`}
            >
              <MiddleEllipsis address={state.userAddress!} />
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
