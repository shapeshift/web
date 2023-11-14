import {
  Box,
  Button,
  CardHeader,
  Divider,
  Flex,
  Heading,
  Skeleton,
  Stack,
  Text as CText,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { bnOrZero, FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaExchangeAlt } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { handleSend } from 'components/Modals/Send/utils'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn } from 'lib/bignumber/bignumber'
import { useGetEstimatedFeesQuery } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import { getThorchainLendingPosition } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'
import { getThorchainFromAddress } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { BorrowRoutePaths } from './types'

type BorrowSweepProps = {
  collateralAssetId: AssetId
  collateralAccountId: AccountId
}

export const BorrowSweep = ({ collateralAssetId, collateralAccountId }: BorrowSweepProps) => {
  const {
    state: { wallet },
  } = useWallet()

  const [isSweepBroadcastPending, setIsSweepBroadcastPending] = useState(false)
  const [fromAddress, setFromAddress] = useState<string | null>(null)
  const [txId, setTxId] = useState<string | null>(null)

  const history = useHistory()
  const translate = useTranslate()
  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))

  const handleBack = useCallback(() => {
    history.push(BorrowRoutePaths.Input)
  }, [history])
  const divider = useMemo(() => <Divider />, [])

  const collateralAccountFilter = useMemo(
    () => ({ accountId: collateralAccountId }),
    [collateralAccountId],
  )
  const collateralAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, collateralAccountFilter),
  )

  const getBorrowFromAddress = useCallback(() => {
    if (!(wallet && collateralAccountMetadata)) return null
    return getThorchainFromAddress({
      accountId: collateralAccountId,
      assetId: collateralAssetId,
      getPosition: getThorchainLendingPosition,
      accountMetadata: collateralAccountMetadata,
      wallet,
    })
  }, [wallet, collateralAccountId, collateralAssetId, collateralAccountMetadata])

  useEffect(() => {
    if (fromAddress) return
    ;(async () => {
      const _fromAddress = await getBorrowFromAddress()
      if (!_fromAddress) return
      setFromAddress(_fromAddress)
    })()
  }, [getBorrowFromAddress, fromAddress])

  const { data: estimatedFeesData, isLoading: isEstimatedFeesDataLoading } =
    useGetEstimatedFeesQuery({
      cryptoAmount: '0',
      assetId: collateralAssetId,
      to: fromAddress ?? '',
      sendMax: true,
      accountId: collateralAccountId,
      contractAddress: undefined,
      enabled: true,
    })

  const handleSweep = useCallback(async () => {
    if (!wallet) return

    setIsSweepBroadcastPending(true)

    try {
      const fromAddress = await getBorrowFromAddress()
      if (!fromAddress)
        throw new Error(`Cannot get from address for accountId: ${collateralAccountId}`)
      if (!estimatedFeesData) throw new Error('Cannot get estimated fees')
      const sendInput = {
        accountId: collateralAccountId,
        to: fromAddress,
        input: fromAddress,
        assetId: collateralAssetId,
        from: '',
        cryptoAmount: '0',
        sendMax: true,
        estimatedFees: estimatedFeesData.estimatedFees,
        amountFieldError: '',
        fiatAmount: '',
        vanityAddress: '',
        feeType: FeeDataKey.Fast,
        fiatSymbol: '',
      }

      const txId = await handleSend({ wallet, sendInput })
      setTxId(txId)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSweepBroadcastPending(false)
    }
  }, [collateralAccountId, collateralAssetId, estimatedFeesData, getBorrowFromAddress, wallet])

  useEffect(() => {
    // Once we have a Txid, the Tx is in the mempool which is enough to broadcast the actual Tx
    if (!txId) return
    history.push(BorrowRoutePaths.Confirm)
  }, [history, txId])

  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(collateralAssetId).chainId),
  )

  const providerIcon = 'https://assets.coincap.io/assets/icons/rune@2x.png'

  if (!collateralAsset || !feeAsset) return null

  // TODO(gomes): move the guts of this to a <Sweep /> component to be reused at repayment step, as well as in savers
  return (
    <SlideTransition>
      <Flex flexDir='column' width='full'>
        <CardHeader>
          <WithBackButton handleBack={handleBack}>
            <Heading as='h5' textAlign='center'>
              <Text translation='Consolidate Funds' />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <Stack spacing={0} divider={divider}>
          <Stack py={4} spacing={4} px={6} fontSize='sm' fontWeight='medium'>
            <Stack flex={1} spacing={6} p={4} textAlign='center'>
              <Stack
                spacing={4}
                direction='row'
                alignItems='center'
                justifyContent='center'
                color='text.subtle'
                pt={6}
              >
                {providerIcon && (
                  <>
                    <AssetIcon src={collateralAsset.icon} />
                    <FaExchangeAlt />
                    <AssetIcon src={providerIcon} size='md' />
                  </>
                )}
              </Stack>
              <Stack>
                <CText color='text.subtle'>
                  {translate('modals.send.consolidate.body', { asset: collateralAsset.name })}
                </CText>
              </Stack>
              <Stack justifyContent='space-between'>
                <Button
                  onClick={handleSweep}
                  disabled={isEstimatedFeesDataLoading || isSweepBroadcastPending}
                  size='lg'
                  colorScheme={'blue'}
                  width='full'
                  data-test='utxo-sweep-button'
                  isLoading={isEstimatedFeesDataLoading || isSweepBroadcastPending}
                  loadingText={translate('common.loadingText')}
                >
                  {translate('modals.send.consolidate.consolidateFunds')}
                </Button>
                <Button
                  onClick={handleBack}
                  size='lg'
                  width='full'
                  colorScheme='gray'
                  isDisabled={false}
                >
                  {translate('modals.approve.reject')}
                </Button>
              </Stack>
            </Stack>
            <Stack p={4}>
              <Row>
                <Row.Label>{translate('modals.approve.estimatedGas')}</Row.Label>
                <Row.Value>
                  <Skeleton isLoaded={!isEstimatedFeesDataLoading}>
                    <Box textAlign='right'>
                      <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? '0'} />
                      <Amount.Crypto
                        color='text.subtle'
                        value={bnOrZero(estimatedFeesData?.txFeeCryptoBaseUnit)
                          .div(bn(10).pow(collateralAsset?.precision ?? '0'))
                          .toString()}
                        symbol={feeAsset.symbol}
                      />
                    </Box>
                  </Skeleton>
                </Row.Value>
              </Row>
            </Stack>
          </Stack>
        </Stack>
      </Flex>
    </SlideTransition>
  )
}
