import { Box, Button, Center, Link, ModalBody, ModalFooter, Stack } from '@chakra-ui/react'
import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
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
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

interface ClaimStatusState {
  txid: string
  assetId: AssetId
  amount: string
  userAddress: string
  estimatedGas: string
  usedGasFee?: string
  status: string
  chainId: ChainId
}

enum TxStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

type ClaimState = {
  txStatus: TxStatus
  usedGasFee?: string
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

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Cosmos', 'ClaimStatus'],
})

export const ClaimStatus = () => {
  const { history: browserHistory } = useBrowserRouter()
  const translate = useTranslate()
  const {
    state: { txid, amount, assetId, userAddress },
  } = useLocation<ClaimStatusState>()
  const [state, setState] = useState<ClaimState>({
    txStatus: TxStatus.PENDING,
  })

  // Asset Info
  const asset = useAppSelector(state => selectAssetById(state, assetId)) // TODO: diff denom for rewards

  useEffect(() => {
    ;(async () => {
      if (!txid) return
      try {
        setState({
          ...state,
          txStatus: txid ? TxStatus.SUCCESS : TxStatus.FAILED,
        })
      } catch (error) {
        moduleLogger.error(error, 'ClaimStatus error')
        setState({
          ...state,
          txStatus: TxStatus.FAILED,
        })
      }
    })()
  }, [state, txid])

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
          {txid && (
            <Row>
              <Row.Label>{translate('modals.status.transactionId')}</Row.Label>
              <Row.Value>
                <Link isExternal color='blue.500' href={`${asset?.explorerTxLink}${txid}`}>
                  <MiddleEllipsis address={txid} />
                </Link>
              </Row.Value>
            </Row>
          )}
          <Row>
            <Row.Label>{translate('defi.modals.claim.claimAmount')}</Row.Label>
            <Row.Value>
              <Amount.Crypto
                value={bnOrZero(amount).div(`1e+${asset.precision}`).toString()}
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
                href={`${asset?.explorerAddressLink}${userAddress}`}
              >
                <MiddleEllipsis address={userAddress} />
              </Link>
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
