import { CheckCircleIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  Heading,
  Skeleton,
  Spinner,
  Stack,
} from '@chakra-ui/react'
import { CHAIN_NAMESPACE, fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHistory } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { useAccountIds } from 'components/MultiHopTrade/hooks/useAccountIds'
import { checkApprovalNeeded } from 'components/MultiHopTrade/hooks/useAllowanceApproval/helpers'
import { getReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectBuyAsset,
  selectPortfolioAccountMetadataByAccountId,
  selectSellAsset,
} from 'state/slices/selectors'
import { selectFirstHop } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { WithBackButton } from '../WithBackButton'

export const VerifyAddresses = () => {
  const wallet = useWallet().state.wallet
  const history = useHistory()

  const [sellAddress, setSellAddress] = useState<string | undefined>()
  const [buyAddress, setBuyAddress] = useState<string | undefined>()
  const [isSellVerifying, setIsSellVerifying] = useState(false)
  const [isBuyVerifying, setIsBuyVerifying] = useState(false)

  const [sellVerified, setSellVerified] = useState(false)
  const [buyVerified, setBuyVerified] = useState(false)

  const buyAsset = useAppSelector(selectBuyAsset)
  const sellAsset = useAppSelector(selectSellAsset)
  const tradeQuoteStep = useAppSelector(selectFirstHop)

  const { sellAssetAccountId, buyAssetAccountId } = useAccountIds()

  const sellAccountFilter = useMemo(
    () => ({ accountId: sellAssetAccountId ?? '' }),
    [sellAssetAccountId],
  )
  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, sellAccountFilter),
  )
  const buyAccountFilter = useMemo(
    () => ({ accountId: buyAssetAccountId ?? '' }),
    [buyAssetAccountId],
  )
  const buyAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, buyAccountFilter),
  )

  const handleContinue = useCallback(async () => {
    if (!tradeQuoteStep) throw Error('missing tradeQuoteStep')
    if (!wallet) throw Error('missing wallet')

    const isApprovalNeeded = await checkApprovalNeeded(tradeQuoteStep, wallet)
    if (isApprovalNeeded) {
      history.push({ pathname: TradeRoutePaths.Approval })
      return
    }

    history.push({ pathname: TradeRoutePaths.Confirm })
  }, [history, tradeQuoteStep, wallet])

  const fetchAddresses = useCallback(async () => {
    if (
      !wallet ||
      !sellAssetAccountId ||
      !buyAssetAccountId ||
      !sellAccountMetadata ||
      !buyAccountMetadata
    )
      return

    const deviceId = await wallet.getDeviceID()

    const fetchedSellAddress = await getReceiveAddress({
      asset: sellAsset,
      wallet,
      deviceId,
      accountMetadata: sellAccountMetadata,
      pubKey: fromAccountId(sellAssetAccountId).account,
    })
    const fetchedBuyAddress = await getReceiveAddress({
      asset: buyAsset,
      wallet,
      deviceId,
      accountMetadata: buyAccountMetadata,
      pubKey: fromAccountId(buyAssetAccountId).account,
    })

    setSellAddress(fetchedSellAddress)
    setBuyAddress(fetchedBuyAddress)
  }, [
    wallet,
    sellAssetAccountId,
    buyAssetAccountId,
    sellAccountMetadata,
    buyAccountMetadata,
    sellAsset,
    buyAsset,
  ])

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  const handleVerify = useCallback(
    async (type: 'sell' | 'buy') => {
      if (type === 'sell') {
        setIsSellVerifying(true)
      } else if (type === 'buy') {
        setIsBuyVerifying(true)
      }

      try {
        const asset = type === 'sell' ? sellAsset : buyAsset
        const accountMetadata = type === 'sell' ? sellAccountMetadata : buyAccountMetadata
        const _address = type === 'sell' ? sellAddress : buyAddress

        if (!asset || !accountMetadata || !_address || !wallet) return

        const { chainId } = asset
        const adapter = getChainAdapterManager().get(chainId)

        if (!adapter) return

        const { bip44Params } = accountMetadata

        const { chainNamespace } = fromChainId(asset.chainId)
        if (CHAIN_NAMESPACE.Utxo === chainNamespace && !accountMetadata.accountType) return

        const deviceAddress = await adapter.getAddress({
          wallet,
          showOnDevice: true,
          accountType: accountMetadata.accountType,
          accountNumber: bip44Params.accountNumber,
        })

        if (deviceAddress && deviceAddress.toLowerCase() === _address.toLowerCase()) {
          if (type === 'sell') {
            setSellVerified(true)
          } else if (type === 'buy') {
            setBuyVerified(true)
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (type === 'sell') {
          setIsSellVerifying(false)
        } else if (type === 'buy') {
          setIsBuyVerifying(false)
        }
      }
    },
    [sellAsset, buyAsset, sellAccountMetadata, buyAccountMetadata, sellAddress, buyAddress, wallet],
  )

  const renderButton = useMemo(() => {
    if (!buyVerified) {
      return (
        <Button
          size='lg'
          colorScheme='blue'
          onClick={() => handleVerify('buy')}
          isLoading={isBuyVerifying}
          loadingText='Confirm on device'
        >
          <Text translation={['trade.verifyAsset', { asset: buyAsset.symbol }]} />
        </Button>
      )
    }

    if (!sellVerified) {
      return (
        <Button
          size='lg'
          colorScheme='blue'
          onClick={() => handleVerify('sell')}
          isLoading={isSellVerifying}
          loadingText='Confirm on device'
        >
          <Text translation={['trade.verifyAsset', { asset: sellAsset.symbol }]} />
        </Button>
      )
    }
    return (
      <Button
        onClick={handleContinue}
        size='lg'
        colorScheme='blue'
        isDisabled={!(sellVerified && buyVerified)}
        width='full'
      >
        <Text translation='common.continue' />
      </Button>
    )
  }, [
    buyAsset.symbol,
    buyVerified,
    handleContinue,
    handleVerify,
    isBuyVerifying,
    isSellVerifying,
    sellAsset.symbol,
    sellVerified,
  ])

  const handleBack = useCallback(() => {
    history.push(TradeRoutePaths.Input)
  }, [history])

  return (
    <SlideTransition>
      <CardHeader>
        <WithBackButton handleBack={handleBack}>
          <Heading as='h5' textAlign='center'>
            <Text translation='trade.verifyAddresses' />
          </Heading>
        </WithBackButton>
      </CardHeader>

      <CardBody display='flex' flexDir='column' gap={4}>
        <Card overflow='hidden'>
          <CardHeader display='flex' alignItems='center' gap={2}>
            <AssetIcon size='xs' assetId={buyAsset.assetId} />
            <Text translation={['trade.assetAddress', { asset: buyAsset.symbol }]} />
          </CardHeader>
          <CardBody bg='background.surface.raised.base'>
            <Stack>
              <Flex alignItems='center' gap={2} justifyContent='space-between'>
                <Flex alignItems='center' gap={2}>
                  <Skeleton isLoaded={!!buyAddress}>
                    <RawText>{buyAddress}</RawText>
                  </Skeleton>
                </Flex>
                {isBuyVerifying && <Spinner boxSize={5} />}
                {buyVerified && <CheckCircleIcon ml='auto' boxSize={5} color='text.success' />}
              </Flex>
            </Stack>
          </CardBody>
        </Card>
        <Card overflow='hidden'>
          <CardHeader display='flex' alignItems='center' gap={2}>
            <AssetIcon size='xs' assetId={sellAsset.assetId} />
            <Text translation={['trade.assetAddress', { asset: sellAsset.symbol }]} />
          </CardHeader>
          <CardBody bg='background.surface.raised.base'>
            <Stack>
              <Flex alignItems='center' gap={2} justifyContent='space-between'>
                <Flex alignItems='center' gap={2}>
                  <Skeleton isLoaded={!!sellAddress}>
                    <RawText>{sellAddress}</RawText>
                  </Skeleton>
                </Flex>
                {isSellVerifying && <Spinner boxSize={5} />}
                {sellVerified && <CheckCircleIcon ml='auto' boxSize={5} color='text.success' />}
              </Flex>
            </Stack>
          </CardBody>
        </Card>
      </CardBody>
      <CardFooter flexDir='column' gap={4}>
        <Alert status='warning'>
          <AlertIcon />
          <AlertDescription>
            <Text translation='trade.verifyAddressMessage' />
          </AlertDescription>
        </Alert>
        {renderButton}
      </CardFooter>
    </SlideTransition>
  )
}
