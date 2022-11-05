import { Box, Button, Center, Link, ModalBody, ModalFooter, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@keepkey/caip'
import { ASSET_REFERENCE, toAssetId } from '@keepkey/caip'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import isNil from 'lodash/isNil'
import { useEffect, useMemo, useState } from 'react'
import { FaCheck, FaTimes } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router'
import type { TransactionReceipt } from 'web3-core/types'
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
import { poll } from 'lib/poll/poll'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

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
  namespace: ['DeFi', 'Providers', 'Foxy', 'Overview', 'ClaimStatus'],
})

type ClaimStatusProps = {
  accountId: Nullable<AccountId>
}

export const ClaimStatus: React.FC<ClaimStatusProps> = ({ accountId }) => {
  const { history: browserHistory } = useBrowserRouter()
  const { foxy } = useFoxy()
  const translate = useTranslate()
  const {
    state: { txid, amount, assetId, userAddress, estimatedGas, chainId },
  } = useLocation<ClaimStatusState>()
  const [state, setState] = useState<ClaimState>({
    txStatus: TxStatus.PENDING,
  })

  // Asset Info
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const { refetch: refetchFoxyBalances } = useFoxyBalances({
    accountNumber: bip44Params?.accountNumber ?? 0,
  })
  useEffect(() => {
    ;(async () => {
      if (!foxy || !txid) return
      try {
        const transactionReceipt = await poll({
          fn: () => foxy.getTxReceipt({ txid }),
          validate: (result: TransactionReceipt) => !isNil(result),
          interval: 15000,
          maxAttempts: 30,
        })
        const gasPrice = await foxy.getGasPrice()

        if (transactionReceipt.status) {
          refetchFoxyBalances()
        }

        setState({
          ...state,
          txStatus: transactionReceipt.status ? TxStatus.SUCCESS : TxStatus.FAILED,
          usedGasFee: bnOrZero(gasPrice).times(transactionReceipt.gasUsed).toFixed(0),
        })
      } catch (error) {
        moduleLogger.error(error, 'ClaimStatus error')
        setState({
          ...state,
          txStatus: TxStatus.FAILED,
          usedGasFee: estimatedGas,
        })
      }
    })()
  }, [refetchFoxyBalances, estimatedGas, foxy, state, txid])

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
                    state.txStatus === TxStatus.PENDING ? estimatedGas : state.usedGasFee,
                  )
                    .div(`1e+${feeAsset.precision}`)
                    .times(feeMarketData.price)
                    .toFixed(2)}
                />
                <Amount.Crypto
                  color='gray.500'
                  value={bnOrZero(
                    state.txStatus === TxStatus.PENDING ? estimatedGas : state.usedGasFee,
                  )
                    .div(`1e+${feeAsset.precision}`)
                    .toFixed(5)}
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
