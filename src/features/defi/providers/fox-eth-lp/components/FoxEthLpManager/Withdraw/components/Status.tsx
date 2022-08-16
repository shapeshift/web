import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { foxAssetId, foxEthLpAssetId } from 'features/defi/providers/fox-eth-lp/constants'
import { useContext, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useFoxEthLpBalances } from 'pages/Defi/hooks/useFoxEthLpBalances'
import {
  selectAssetById,
  selectFirstAccountSpecifierByChainId,
  selectMarketDataById,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { FoxEthLpWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

export const Status = () => {
  const [userAddress, setUserAddres] = useState<string | null>(null)
  const translate = useTranslate()
  const { state, dispatch } = useContext(WithdrawContext)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId } = query
  const { opportunity, getOpportunityData } = useFoxEthLpBalances()
  const {
    state: { wallet },
  } = useWallet()

  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const ethMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))
  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const lpAsset = useAppSelector(state => selectAssetById(state, foxEthLpAssetId))

  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, chainId),
  )
  useEffect(() => {
    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>
    if (wallet && adapter) {
      ;(async () => {
        const address = await adapter.getAddress({ wallet })
        setUserAddres(address)
      })()
    }
  }, [ethAsset.chainId, wallet])

  const serializedTxIndex = useMemo(() => {
    if (!(state?.txid && userAddress)) return ''
    return serializeTxIndex(accountSpecifier, state.txid, userAddress)
  }, [state?.txid, userAddress, accountSpecifier])
  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  useEffect(() => {
    if (confirmedTransaction && confirmedTransaction.status !== 'Pending' && dispatch) {
      dispatch({
        type: FoxEthLpWithdrawActionType.SET_WITHDRAW,
        payload: {
          txStatus: confirmedTransaction.status === 'Confirmed' ? 'success' : 'failed',
          usedGasFee: confirmedTransaction.fee
            ? bnOrZero(confirmedTransaction.fee.value).div(`1e${ethAsset.precision}`).toString()
            : '0',
        },
      })
      getOpportunityData()
    }
  }, [confirmedTransaction, dispatch, ethAsset.precision, getOpportunityData])

  const handleViewPosition = () => {
    browserHistory.push('/defi')
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  if (!state) return null

  const { statusIcon, statusText, statusBg, statusBody } = (() => {
    switch (state.withdraw.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='gray.900' fontSize='xs' />,
          statusBg: 'green.500',
          statusBody: translate('modals.withdraw.status.success', {
            opportunity: lpAsset.symbol,
          }),
        }
      case 'failed':
        return {
          statusText: StatusTextEnum.failed,
          statusIcon: <CloseIcon color='gray.900' fontSize='xs' />,
          statusBg: 'red.500',
          statusBody: translate('modals.withdraw.status.failed'),
        }
      default:
        return {
          statusIcon: null,
          statusText: StatusTextEnum.pending,
          statusBg: 'transparent',
          statusBody: translate('modals.withdraw.status.pending'),
        }
    }
  })()

  return (
    <TxStatus
      onClose={handleCancel}
      onContinue={state.withdraw.txStatus === 'success' ? handleViewPosition : undefined}
      loading={!['success', 'failed'].includes(state.withdraw.txStatus)}
      continueText='modals.status.position'
      statusText={statusText}
      statusIcon={statusIcon}
      statusBg={statusBg}
      statusBody={statusBody}
      pairIcons={opportunity.icons}
    >
      <Summary spacing={0} mx={6} mb={4}>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <PairIcons
                icons={opportunity.icons!}
                iconBoxSize='5'
                h='38px'
                p={1}
                borderRadius={8}
              />
              <RawText>{lpAsset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.lpAmount} symbol={lpAsset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='common.receive' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={foxAsset.icon} />
              <RawText>{foxAsset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.foxAmount} symbol={foxAsset.symbol} />
            </Row.Value>
          </Row>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={ethAsset.icon} />
              <RawText>{ethAsset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.ethAmount} symbol={ethAsset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <Text
              translation={
                state.withdraw.txStatus === 'pending'
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
                  state.withdraw.txStatus === 'pending'
                    ? state.withdraw.estimatedGasCrypto
                    : state.withdraw.usedGasFee,
                )
                  .times(ethMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(
                  state.withdraw.txStatus === 'pending'
                    ? state.withdraw.estimatedGasCrypto
                    : state.withdraw.usedGasFee,
                ).toFixed(5)}
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
            rightIcon={<ExternalLinkIcon />}
            href={`${ethAsset.explorerTxLink}${state.txid}`}
          >
            {translate('defi.viewOnChain')}
          </Button>
        </Row>
      </Summary>
    </TxStatus>
  )
}
