import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  Collapse,
  Flex,
  Heading,
  HStack,
  Stack,
} from '@chakra-ui/react'
import { fromAccountId, fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { utils } from 'ethers'
import { useCallback, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { estimateFees } from 'components/Modals/Send/utils'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getSupportedEvmChainIds } from 'lib/utils/evm'
import type { ConfirmedQuote } from 'lib/utils/thorchain/lp/types'
import { usePools } from 'pages/ThorChainLP/hooks/usePools'
import { AsymSide } from 'pages/ThorChainLP/hooks/useUserLpData'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddLiquidityRoutePaths } from './types'

type AddLiquidityStatusProps = {
  confirmedQuote: ConfirmedQuote
}

export const AddLiquidityStatus = ({ confirmedQuote }: AddLiquidityStatusProps) => {
  const translate = useTranslate()
  const history = useHistory()
  const [firstTx, setFirstTx] = useState(TxStatus.Unknown)
  const [secondTx, setSecondTx] = useState(TxStatus.Pending)
  const [isComplete, setIsComplete] = useState(false)
  const wallet = useWallet().state.wallet

  const { opportunityId } = confirmedQuote

  const { data: parsedPools } = usePools()

  const foundPool = useMemo(() => {
    if (!parsedPools) return undefined

    return parsedPools.find(pool => pool.opportunityId === opportunityId)
  }, [opportunityId, parsedPools])

  const asset = useAppSelector(state => selectAssetById(state, foundPool?.assetId ?? ''))
  const rune = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const assets: Asset[] = useMemo(() => {
    if (!(foundPool && asset && rune)) return []

    if (foundPool.asymSide === null) return [asset, rune]
    if (foundPool.asymSide === AsymSide.Rune) return [rune]
    if (foundPool.asymSide === AsymSide.Asset) return [asset]

    throw new Error('Invalid asym side')
  }, [asset, foundPool, rune])

  const handleGoBack = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Input)
  }, [history])

  const buildAndSign = useCallback(
    (asset: Asset) => {
      const amountCryptoPrecision =
        asset.assetId === thorchainAssetId
          ? confirmedQuote.runeCryptoLiquidityAmount
          : confirmedQuote.assetCryptoLiquidityAmount
      console.log('xxx amountCryptoPrecision', amountCryptoPrecision)
    },
    [confirmedQuote],
  )

  const handleNext = useCallback(
    (asset: Asset, index: number) => () => {
      buildAndSign(asset)
      console.log('xxx data', { assetsLength: assets.length, index })
      index === 0 ? setFirstTx(TxStatus.Confirmed) : setSecondTx(TxStatus.Confirmed)
      switch (index) {
        case 0:
          setFirstTx(TxStatus.Confirmed)
          setSecondTx(TxStatus.Unknown)
          break
        case 1:
          setSecondTx(TxStatus.Confirmed)
          break
        default:
          break
      }
      index === assets.length - 1 && setIsComplete(true)
      // build and sign!
      // const supportedEvmChainIds = getSupportedEvmChainIds()
      // const maybeTxId = (() => {
      //   if (!defaultAccountId) return Promise.reject('No default account id')
      //   if (!wallet) return Promise.reject('No wallet')
      //   return (async () => {
      //     const { account } = fromAccountId(defaultAccountId)

      //     const estimatedFees = await estimateFees({
      //       cryptoAmount: '1',
      //       assetId: thorchainAssetId,
      //       memo: supportedEvmChainIds.includes(
      //         fromAssetId(thorchainAssetId).chainId as KnownChainIds,
      //       )
      //         ? utils.hexlify(utils.toUtf8Bytes('+:ETH.ETH::t:0'))
      //         : '+:ETH.ETH::t:0',
      //       to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      //       sendMax: false,
      //       accountId: defaultAccountId,
      //       contractAddress: undefined,
      //     })

      //     const adapter = assertGetThorchainChainAdapter()

      //     // LP deposit using THOR is a MsgDeposit tx
      //     const { txToSign } = await adapter.buildDepositTransaction({
      //       from: account,
      //       accountNumber: 0,
      //       value: '1',
      //       memo: '+:ETH.ETH::t:0',
      //       chainSpecific: {
      //         gas: (estimatedFees as FeeDataEstimate<KnownChainIds.ThorchainMainnet>).fast
      //           .chainSpecific.gasLimit,
      //         fee: (estimatedFees as FeeDataEstimate<KnownChainIds.ThorchainMainnet>).fast.txFee,
      //       },
      //     })
      //     const signedTx = await adapter.signTransaction({
      //       txToSign,
      //       wallet,
      //     })
      //     return adapter.broadcastTransaction({
      //       senderAddress: account,
      //       receiverAddress: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      //       hex: signedTx,
      //     })
      //   })()
    },
    [assets.length, buildAndSign],
  )

  const hStackDivider = useMemo(() => {
    if (foundPool?.asymSide) return <></>

    return <RawText mx={1}>{translate('common.and')}</RawText>
  }, [foundPool?.asymSide, translate])

  const renderBody = useMemo(() => {
    if (!(foundPool && asset && rune)) return null

    if (isComplete) {
      return (
        <CardBody display='flex' flexDir='column' alignItems='center' justifyContent='center'>
          <Center
            bg='background.success'
            boxSize='80px'
            borderRadius='full'
            color='text.success'
            fontSize='xl'
            my={8}
          >
            <FaCheck />
          </Center>
          <Heading as='h4'>{translate('pools.transactionSubmitted')}</Heading>
        </CardBody>
      )
    }

    const supplyAssets = assets.map(_asset => {
      const amountCryptoPrecision =
        _asset.assetId === thorchainAssetId
          ? confirmedQuote.runeCryptoLiquidityAmount
          : confirmedQuote.assetCryptoLiquidityAmount
      return <Amount.Crypto value={amountCryptoPrecision} symbol={_asset.symbol} />
    })

    return (
      <CardBody textAlign='center'>
        <Center my={8}>
          <CircularProgress
            size='100px'
            thickness={4}
            isIndeterminate
            trackColor='background.surface.raised.base'
          />
        </Center>
        <Heading as='h4'>{translate('pools.waitingForConfirmation')}</Heading>
        <Flex gap={1} justifyContent='center' fontWeight='medium'>
          <RawText>{translate('pools.supplying')}</RawText>
          <HStack divider={hStackDivider}>{supplyAssets}</HStack>
        </Flex>
      </CardBody>
    )
  }, [asset, assets, confirmedQuote, foundPool, hStackDivider, isComplete, rune, translate])

  const assetCards = useMemo(() => {
    return assets.map((asset, index) => {
      const amountCryptoPrecision =
        asset.assetId === thorchainAssetId
          ? confirmedQuote.runeCryptoLiquidityAmount
          : confirmedQuote.assetCryptoLiquidityAmount
      return (
        <Card key={asset.assetId}>
          <CardHeader gap={2} display='flex' flexDir='row' alignItems='center'>
            <AssetIcon size='xs' assetId={asset.assetId} />
            <Amount.Crypto
              fontWeight='bold'
              value={amountCryptoPrecision}
              symbol={asset.symbol}
            />{' '}
            <Flex ml='auto' alignItems='center' gap={2}>
              {(index === 0 && firstTx === TxStatus.Confirmed) ||
              (index === 1 && secondTx === TxStatus.Confirmed) ? (
                <>
                  <Button size='xs'>{translate('common.seeDetails')}</Button>
                  <Center
                    bg='background.success'
                    boxSize='24px'
                    borderRadius='full'
                    color='text.success'
                    fontSize='xs'
                  >
                    <FaCheck />
                  </Center>
                </>
              ) : (
                <CircularProgress size='24px' />
              )}
            </Flex>
          </CardHeader>
          <Collapse in={index === 0 ? firstTx === TxStatus.Unknown : secondTx === TxStatus.Unknown}>
            <CardBody display='flex' flexDir='column' gap={2}>
              <Row fontSize='sm'>
                <Row.Label>{translate('common.gasFee')}</Row.Label>
                <Row.Value>
                  <Amount.Crypto value='0.02' symbol={asset.symbol} />
                </Row.Value>
              </Row>
              <Button mx={-2} size='lg' colorScheme='blue' onClick={handleNext(asset, index)}>
                {translate('common.signTransaction')}
              </Button>
            </CardBody>
          </Collapse>
        </Card>
      )
    })
  }, [
    assets,
    confirmedQuote.runeCryptoLiquidityAmount,
    confirmedQuote.assetCryptoLiquidityAmount,
    firstTx,
    secondTx,
    translate,
    handleNext,
  ])

  if (!foundPool) return null

  return (
    <SlideTransition>
      {renderBody}
      <CardFooter flexDir='column' px={4}>
        <Stack mt={4}>{assetCards}</Stack>
      </CardFooter>
      {isComplete && (
        <CardFooter flexDir='column'>
          <Button size='lg' mx={-2} onClick={handleGoBack}>
            {translate('common.goBack')}
          </Button>
        </CardFooter>
      )}
    </SlideTransition>
  )
}
