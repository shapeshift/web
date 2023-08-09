import { Box, Button, Center, Link, ModalBody, ModalFooter, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import type { ethers } from 'ethers'
import isNil from 'lodash/isNil'
import { useCallback, useEffect, useState } from 'react'
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
import { usePoll } from 'hooks/usePoll/usePoll'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesApiSlice'
import { DefiProvider, DefiType } from 'state/slices/opportunitiesSlice/types'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

interface ClaimStatusState {
  txid: string
  assetId: AssetId
  amount: string
  userAddress: string
  estimatedGas: string
  usedGasFeeCryptoPrecision?: string
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
  usedGasFeeCryptoBaseUnit?: string
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

type ClaimStatusProps = {
  accountId: AccountId | undefined
}

export const ClaimStatus: React.FC<ClaimStatusProps> = ({ accountId }) => {
  const { poll } = usePoll<ethers.providers.TransactionReceipt>()
  const { history: browserHistory } = useBrowserRouter()
  const foxyApi = getFoxyApi()
  const translate = useTranslate()
  const {
    state: { txid, amount, assetId, userAddress, estimatedGas, chainId },
  } = useLocation<ClaimStatusState>()
  const [state, setState] = useState<ClaimState>({
    txStatus: TxStatus.PENDING,
  })

  // Asset Info
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  const dispatch = useAppDispatch()
  // TODO: maybeRefetchOpportunities heuristics
  const refetchFoxyBalances = useCallback(() => {
    if (!accountId) return

    dispatch(
      opportunitiesApi.endpoints.getOpportunitiesUserData.initiate(
        {
          accountId,
          defiType: DefiType.Staking,
          defiProvider: DefiProvider.ShapeShift,
        },
        { forceRefetch: true },
      ),
    )
  }, [accountId, dispatch])

  useEffect(() => {
    ;(async () => {
      if (!foxyApi || !txid) return
      try {
        const transactionReceipt = await poll({
          fn: () => foxyApi.getTxReceipt({ txid }),
          validate: (result: ethers.providers.TransactionReceipt) => !isNil(result),
          interval: 15000,
          maxAttempts: 30,
        })

        if (transactionReceipt.status) {
          refetchFoxyBalances()
        }

        setState({
          ...state,
          txStatus: transactionReceipt.status ? TxStatus.SUCCESS : TxStatus.FAILED,
          usedGasFeeCryptoBaseUnit: transactionReceipt.effectiveGasPrice
            .mul(transactionReceipt.gasUsed)
            .toString(),
        })
      } catch (error) {
        console.error(error)
        setState({
          ...state,
          txStatus: TxStatus.FAILED,
          usedGasFeeCryptoBaseUnit: estimatedGas,
        })
      }
    })()
  }, [refetchFoxyBalances, estimatedGas, foxyApi, state, txid, poll])

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
                    state.txStatus === TxStatus.PENDING
                      ? estimatedGas
                      : state.usedGasFeeCryptoBaseUnit,
                  )
                    .div(`1e+${feeAsset.precision}`)
                    .times(feeMarketData.price)
                    .toFixed(2)}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={bnOrZero(
                    state.txStatus === TxStatus.PENDING
                      ? estimatedGas
                      : state.usedGasFeeCryptoBaseUnit,
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
