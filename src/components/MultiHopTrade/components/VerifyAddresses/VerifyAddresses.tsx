import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
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
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { useAccountIds } from 'components/MultiHopTrade/hooks/useAccountIds'
import { getReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import {
  selectAccountIdsByChainIdFilter,
  selectInputBuyAsset,
  selectInputSellAsset,
  selectManualReceiveAddress,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { WithBackButton } from '../WithBackButton'

export const VerifyAddresses = () => {
  const wallet = useWallet().state.wallet
  const history = useHistory()
  const translate = useTranslate()

  const [sellAddress, setSellAddress] = useState<string | undefined>()
  const [buyAddress, setBuyAddress] = useState<string | undefined>()
  const [isSellVerifying, setIsSellVerifying] = useState(false)
  const [isBuyVerifying, setIsBuyVerifying] = useState(false)

  const [buyStatus, setBuyStatus] = useState('pending')
  const [sellStatus, setSellStatus] = useState('pending')
  const [buyErrorMessage, setBuyErrorMessage] = useState<string | undefined>()
  const [sellErrorMessage, setSellErrorMessage] = useState<string | undefined>()

  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAsset = useAppSelector(selectInputSellAsset)

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

  const maybeManualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  const buyAccountIdsFilter = useMemo(
    () => ({
      chainId: buyAssetAccountId ? fromAccountId(buyAssetAccountId).chainId : '',
    }),
    [buyAssetAccountId],
  )
  const buyAccountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, buyAccountIdsFilter),
  )

  const shouldVerifyBuyAddress = useMemo(
    () =>
      !maybeManualReceiveAddress ||
      (buyAssetAccountId &&
        buyAccountMetadata &&
        walletSupportsChain({
          chainId: buyAsset.chainId,
          wallet,
          isSnapInstalled: false,
          checkConnectedAccountIds: buyAccountIds,
        })),
    [
      maybeManualReceiveAddress,
      buyAssetAccountId,
      buyAccountMetadata,
      buyAsset.chainId,
      wallet,
      buyAccountIds,
    ],
  )

  useEffect(() => {
    if (!shouldVerifyBuyAddress) {
      setBuyStatus('notRequired')
    }
  }, [shouldVerifyBuyAddress])

  const handleContinue = useCallback(() => {
    history.push({ pathname: TradeRoutePaths.Confirm })
  }, [history])

  const fetchAddresses = useCallback(async () => {
    if (!wallet || !sellAssetAccountId || !sellAccountMetadata) return

    const deviceId = await wallet.getDeviceID()

    const fetchedSellAddress = await getReceiveAddress({
      asset: sellAsset,
      wallet,
      deviceId,
      accountMetadata: sellAccountMetadata,
      pubKey: fromAccountId(sellAssetAccountId).account,
    })
    const fetchedOrManualBuyAddress = shouldVerifyBuyAddress
      ? await getReceiveAddress({
          asset: buyAsset,
          wallet,
          deviceId,
          accountMetadata: buyAccountMetadata!,
          pubKey: fromAccountId(buyAssetAccountId!).account,
        })
      : maybeManualReceiveAddress

    setSellAddress(fetchedSellAddress)
    setBuyAddress(fetchedOrManualBuyAddress)
  }, [
    wallet,
    sellAssetAccountId,
    sellAccountMetadata,
    sellAsset,
    shouldVerifyBuyAddress,
    buyAsset,
    buyAccountMetadata,
    buyAssetAccountId,
    maybeManualReceiveAddress,
  ])

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  const isVerifying = useMemo(
    () => isSellVerifying || isBuyVerifying,
    [isSellVerifying, isBuyVerifying],
  )

  const setIsVerifying = useCallback(
    (type: 'sell' | 'buy', isVerifying: boolean) => {
      if (type === 'sell') {
        setIsSellVerifying(isVerifying)
      } else if (type === 'buy') {
        setIsBuyVerifying(isVerifying)
      }
    },
    [setIsSellVerifying, setIsBuyVerifying],
  )

  const setErrorMessage = useCallback((type: 'sell' | 'buy', errorMessage: string) => {
    if (type === 'sell') {
      setSellErrorMessage(errorMessage)
    } else if (type === 'buy') {
      setBuyErrorMessage(errorMessage)
    }
  }, [])

  const clearErrorMessage = useCallback((type: 'sell' | 'buy') => {
    if (type === 'sell') {
      setSellErrorMessage(undefined)
    } else if (type === 'buy') {
      setBuyErrorMessage(undefined)
    }
  }, [])

  const setStatus = useCallback(
    (type: 'sell' | 'buy', status: 'pending' | 'verified' | 'error' | 'notRequired') => {
      // if the sell and buy addresses are the same, we can skip the verification for the other address
      console.log('sellAddress', sellAddress)
      console.log('buyAddress', buyAddress)
      if (status === 'verified' && sellAddress === buyAddress) {
        setBuyStatus('verified')
        setSellStatus('verified')
        return
      }

      if (type === 'sell') {
        setSellStatus(status)
      } else if (type === 'buy') {
        setBuyStatus(status)
      }
    },
    [sellAddress, buyAddress],
  )

  const handleVerify = useCallback(
    async (type: 'sell' | 'buy') => {
      if (isVerifying) return

      setIsVerifying(type, true)
      clearErrorMessage(type)

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
          setStatus(type, 'verified')
        } else {
          setStatus(type, 'error')
          setErrorMessage(type, translate('walletProvider.ledger.verify.addressMismatch'))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsVerifying(type, false)
      }
    },
    [
      isVerifying,
      setIsVerifying,
      clearErrorMessage,
      sellAsset,
      buyAsset,
      sellAccountMetadata,
      buyAccountMetadata,
      sellAddress,
      buyAddress,
      wallet,
      setStatus,
      setErrorMessage,
      translate,
    ],
  )

  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp({ isSigning: true })

  const handleBuyVerify = useCallback(async () => {
    // Only proceed to verify the buy address if the promise is resolved, i.e the user has opened
    // the Ledger app without cancelling
    await checkLedgerAppOpenIfLedgerConnected(buyAsset.chainId)
      .then(() => handleVerify('buy'))
      .catch(console.error)
  }, [checkLedgerAppOpenIfLedgerConnected, handleVerify, buyAsset.chainId])

  const handleSellVerify = useCallback(async () => {
    // Only proceed to verify the sell address if the promise is resolved, i.e the user has opened
    // the Ledger app without cancelling
    await checkLedgerAppOpenIfLedgerConnected(sellAsset.chainId)
      .then(() => handleVerify('sell'))
      .catch(console.error)
  }, [checkLedgerAppOpenIfLedgerConnected, handleVerify, sellAsset.chainId])

  const verifyBuyAssetTranslation: TextPropTypes['translation'] = useMemo(
    () => ['trade.verifyAsset', { asset: buyAsset.symbol }],
    [buyAsset.symbol],
  )

  const verifySellAssetTranslation: TextPropTypes['translation'] = useMemo(
    () => ['trade.verifyAsset', { asset: sellAsset.symbol }],
    [sellAsset.symbol],
  )

  const buyAssetAddressTranslation: TextPropTypes['translation'] = useMemo(
    () => ['trade.assetAddress', { asset: buyAsset.symbol }],
    [buyAsset.symbol],
  )
  const sellAssetAddressTranslation: TextPropTypes['translation'] = useMemo(
    () => ['trade.assetAddress', { asset: sellAsset.symbol }],
    [sellAsset.symbol],
  )

  const renderButton = useMemo(() => {
    if (buyStatus === 'pending' || buyStatus === 'error') {
      return (
        <Button
          size='lg-multiline'
          colorScheme='blue'
          onClick={handleBuyVerify}
          isLoading={isBuyVerifying}
          isDisabled={isBuyVerifying}
          loadingText={translate('walletProvider.ledger.verify.confirmOnDevice')}
        >
          <Text translation={verifyBuyAssetTranslation} />
        </Button>
      )
    }

    if (sellStatus === 'pending' || sellStatus === 'error') {
      return (
        <Button
          size='lg-multiline'
          colorScheme='blue'
          onClick={handleSellVerify}
          isLoading={isSellVerifying}
          isDisabled={isBuyVerifying}
          loadingText={translate('walletProvider.ledger.verify.confirmOnDevice')}
        >
          <Text translation={verifySellAssetTranslation} />
        </Button>
      )
    }

    return (
      <Button onClick={handleContinue} size='lg' colorScheme='blue' width='full'>
        <Text translation='common.continue' />
      </Button>
    )
  }, [
    buyStatus,
    sellStatus,
    handleContinue,
    handleBuyVerify,
    isBuyVerifying,
    translate,
    verifyBuyAssetTranslation,
    handleSellVerify,
    isSellVerifying,
    verifySellAssetTranslation,
  ])

  const handleBack = useCallback(() => {
    history.push(TradeRoutePaths.Input)
  }, [history])

  return (
    <SlideTransition>
      <Card width='min-content'>
        <CardHeader>
          <WithBackButton onBack={handleBack}>
            <Heading as='h5' textAlign='center'>
              <Text translation='trade.verifyAddresses' />
            </Heading>
          </WithBackButton>
        </CardHeader>

        <CardBody display='flex' flexDir='column' gap={4}>
          {!maybeManualReceiveAddress && (
            <Card overflow='hidden'>
              <CardHeader display='flex' alignItems='center' gap={2}>
                <AssetIcon size='xs' assetId={buyAsset.assetId} />
                <Text translation={buyAssetAddressTranslation} />
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
                    {buyStatus === 'verified' && (
                      <CheckCircleIcon ml='auto' boxSize={5} color='text.success' />
                    )}
                    {buyStatus === 'error' && (
                      <WarningIcon ml='auto' boxSize={5} color='text.error' />
                    )}
                  </Flex>
                </Stack>
              </CardBody>
            </Card>
          )}
          <Card overflow='hidden'>
            <CardHeader display='flex' alignItems='center' gap={2}>
              <AssetIcon size='xs' assetId={sellAsset.assetId} />
              <Text translation={sellAssetAddressTranslation} />
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
                  {sellStatus === 'verified' && (
                    <CheckCircleIcon ml='auto' boxSize={5} color='text.success' />
                  )}
                  {sellStatus === 'error' && (
                    <WarningIcon ml='auto' boxSize={5} color='text.error' />
                  )}
                </Flex>
              </Stack>
            </CardBody>
          </Card>
        </CardBody>
        <CardFooter flexDir='column' gap={4}>
          <Alert status='warning'>
            <AlertIcon />
            <AlertDescription>
              {Boolean(buyErrorMessage || sellErrorMessage) ? (
                <RawText>{buyErrorMessage ?? sellErrorMessage}</RawText>
              ) : (
                <Text translation='trade.verifyAddressMessage' />
              )}
            </AlertDescription>
          </Alert>
          {renderButton}
        </CardFooter>
      </Card>
    </SlideTransition>
  )
}
