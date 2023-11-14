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
import type { Asset } from 'lib/asset-service'
import { bn } from 'lib/bignumber/bignumber'
import { useGetEstimatedFeesQuery } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import { getThorchainLendingPosition } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'
import { getFromAddress } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectPortfolioAccountMetadataByAccountId,
  selectTxById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { BorrowRoutePaths } from './types'

type BorrowConfirmProps = {
  collateralAssetId: AssetId
  depositAmount: string | null
  collateralAccountId: AccountId
  borrowAccountId: AccountId
  borrowAsset: Asset | null
}

export const BorrowSweep = ({
  collateralAssetId,
  depositAmount: _depositAmount,
  collateralAccountId,
  borrowAccountId,
  borrowAsset,
}: BorrowConfirmProps) => {
  const {
    state: { wallet },
  } = useWallet()

  const depositAmount = '0.001' // TODO(gomes): revert me - for development only

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
    return getFromAddress({
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
      cryptoAmount: depositAmount,
      assetId: collateralAssetId,
      to: fromAddress ?? '',
      sendMax: true,
      accountId: collateralAccountId,
      contractAddress: undefined,
    })

  const handleSweep = useCallback(async () => {
    if (!wallet) return
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
  }, [collateralAccountId, collateralAssetId, estimatedFeesData, getBorrowFromAddress, wallet])

  const tx = useAppSelector(state => selectTxById(state, txId ?? ''))

  useEffect(() => {
    console.log({ tx })
    // Once we have a Tx, the Tx is in the mempool which is enough to broadcast the actual Tx
    if (!tx) return
    history.push(BorrowRoutePaths.Confirm)
  }, [tx, history])

  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(collateralAssetId).chainId),
  )

  if (!depositAmount) return null

  // TODO(gomes): implement these, perhaps move me to a <Sweep /> component already?
  const preFooter = null
  const asset = collateralAsset
  const providerIcon = 'https://assets.coincap.io/assets/icons/rune@2x.png'

  if (!collateralAsset || !asset || !feeAsset) return null

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
                    <AssetIcon src={asset.icon} />
                    <FaExchangeAlt />
                    <AssetIcon src={providerIcon} size='md' />
                  </>
                )}
              </Stack>
              <Stack>
                <CText color='text.subtle'>
                  {translate('modals.send.consolidate.body', { asset: asset.name })}
                </CText>
              </Stack>
              <Stack justifyContent='space-between'>
                <Button
                  onClick={handleSweep}
                  disabled={false}
                  size='lg'
                  colorScheme={'blue'}
                  width='full'
                  data-test='utxo-sweep-button'
                  isLoading={false}
                  loadingText={'Loading'}
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
              {preFooter}
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
