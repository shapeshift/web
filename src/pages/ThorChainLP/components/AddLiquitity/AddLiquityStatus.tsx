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
import type { FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
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
import { toBaseUnit } from 'lib/math'
import { assertGetThorchainChainAdapter } from 'lib/utils/cosmosSdk'
import { getSupportedEvmChainIds } from 'lib/utils/evm'
import type { ConfirmedQuote } from 'lib/utils/thorchain/lp/types'
import { usePools } from 'pages/ThorChainLP/hooks/usePools'
import { AsymSide } from 'pages/ThorChainLP/hooks/useUserLpData'
import { selectAssetById, selectFirstAccountIdByChainId } from 'state/slices/selectors'
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

  // FIXME: there should be recieved as part of confirmedQuote
  const defaultAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, asset?.chainId ?? ''),
  )
  const defaultRuneAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, rune?.chainId ?? ''),
  )

  const buildAndSign = useCallback(
    (asset: Asset) => {
      const isRuneTx = asset.assetId === thorchainAssetId
      const amountCryptoPrecision = isRuneTx
        ? confirmedQuote.runeCryptoLiquidityAmount
        : confirmedQuote.assetCryptoLiquidityAmount
      const supportedEvmChainIds = getSupportedEvmChainIds()
      const maybeTxId = (() => {
        if (!defaultAssetAccountId || !defaultRuneAccountId)
          return Promise.reject('Missing account ids')
        if (!wallet) return Promise.reject('No wallet')

        return (async () => {
          const accountId = isRuneTx ? defaultRuneAccountId : defaultAssetAccountId
          const { account } = fromAccountId(accountId)
          const memo = '+:ETH.ETH::t:0' // FIXME
          const cryptoAmount = toBaseUnit(amountCryptoPrecision, asset.precision)

          const estimatedFees = await estimateFees({
            cryptoAmount,
            assetId: asset.assetId,
            memo: supportedEvmChainIds.includes(fromAssetId(asset.assetId).chainId as KnownChainIds)
              ? utils.hexlify(utils.toUtf8Bytes(memo))
              : memo,
            to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146', // TODO: router contract
            sendMax: false,
            accountId,
            contractAddress: undefined,
          })

          const { txToSign, adapter } = await (async () => {
            // We'll probably need to switch on chainNamespace instead here
            if (isRuneTx) {
              const adapter = assertGetThorchainChainAdapter()

              // LP deposit using THOR is a MsgDeposit tx
              const { txToSign } = await adapter.buildDepositTransaction({
                from: account,
                accountNumber: 0, // FIXME
                value: cryptoAmount,
                memo,
                chainSpecific: {
                  gas: (estimatedFees as FeeDataEstimate<KnownChainIds.ThorchainMainnet>).fast
                    .chainSpecific.gasLimit,
                  fee: (estimatedFees as FeeDataEstimate<KnownChainIds.ThorchainMainnet>).fast
                    .txFee,
                },
              })

              return { txToSign, adapter }
            } else throw new Error('Unsupported tx')
          })()

          const signedTx = await adapter.signTransaction({
            txToSign,
            wallet,
          })
          return adapter.broadcastTransaction({
            senderAddress: account,
            receiverAddress: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146', // FIXME: Thorchain router contract
            hex: signedTx,
          })
        })()
      })()
      return maybeTxId
    },
    [
      confirmedQuote.assetCryptoLiquidityAmount,
      confirmedQuote.runeCryptoLiquidityAmount,
      defaultAssetAccountId,
      defaultRuneAccountId,
      wallet,
    ],
  )

  const handleNext = useCallback(
    (asset: Asset, index: number) => () => {
      index === 0 ? setFirstTx(TxStatus.Pending) : setSecondTx(TxStatus.Pending)
      const txId = buildAndSign(asset)
      console.info('txId', txId)
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
