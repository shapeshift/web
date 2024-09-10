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

enum AddressVerificationType {
  Sell = 'sell',
  Buy = 'buy',
}

enum AddressVerificationStatus {
  Pending = 'pending',
  Verified = 'verified',
  Error = 'error',
  NotRequired = 'notRequired',
}

export const VerifyAddresses = () => {
  const wallet = useWallet().state.wallet
  const history = useHistory()
  const translate = useTranslate()

  const [sellAddress, setSellAddress] = useState<string | undefined>()
  const [buyAddress, setBuyAddress] = useState<string | undefined>()
  const [isSellVerifying, setIsSellVerifying] = useState(false)
  const [isBuyVerifying, setIsBuyVerifying] = useState(false)

  const [buyAddressVerificationStatus, setBuyAddressVerificationStatus] =
    useState<AddressVerificationStatus>(AddressVerificationStatus.Pending)
  const [sellAddressVerificationStatus, setSellAddressVerificationStatus] =
    useState<AddressVerificationStatus>(AddressVerificationStatus.Pending)
  const [buyAddressVerificationErrorMessage, setBuyAddressVerificationErrorMessage] = useState<
    string | undefined
  >()
  const [sellAddressVerificationErrorMessage, setSellAddressVerificationErrorMessage] = useState<
    string | undefined
  >()

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
      setBuyAddressVerificationStatus(AddressVerificationStatus.NotRequired)
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
    (type: AddressVerificationType, isVerifying: boolean) => {
      if (type === AddressVerificationType.Sell) {
        setIsSellVerifying(isVerifying)
      } else if (type === AddressVerificationType.Buy) {
        setIsBuyVerifying(isVerifying)
      }
    },
    [setIsSellVerifying, setIsBuyVerifying],
  )

  const setErrorMessage = useCallback((type: AddressVerificationType, errorMessage: string) => {
    if (type === AddressVerificationType.Sell) {
      setSellAddressVerificationErrorMessage(errorMessage)
    } else if (type === AddressVerificationType.Buy) {
      setBuyAddressVerificationErrorMessage(errorMessage)
    }
  }, [])

  const clearErrorMessage = useCallback((type: AddressVerificationType) => {
    if (type === AddressVerificationType.Sell) {
      setSellAddressVerificationErrorMessage(undefined)
    } else if (type === AddressVerificationType.Buy) {
      setBuyAddressVerificationErrorMessage(undefined)
    }
  }, [])

  const setStatus = useCallback(
    (type: AddressVerificationType, status: AddressVerificationStatus) => {
      // if the sell and buy addresses are the same, we can skip the verification for the other address
      if (status === AddressVerificationStatus.Verified && sellAddress === buyAddress) {
        setBuyAddressVerificationStatus(AddressVerificationStatus.Verified)
        setSellAddressVerificationStatus(AddressVerificationStatus.Verified)
        return
      }

      if (type === AddressVerificationType.Sell) {
        setSellAddressVerificationStatus(status)
      } else if (type === AddressVerificationType.Buy) {
        setBuyAddressVerificationStatus(status)
      }
    },
    [sellAddress, buyAddress],
  )

  const handleVerify = useCallback(
    async (type: AddressVerificationType) => {
      if (isVerifying) return

      setIsVerifying(type, true)
      clearErrorMessage(type)

      try {
        const asset = type === AddressVerificationType.Sell ? sellAsset : buyAsset
        const accountMetadata =
          type === AddressVerificationType.Sell ? sellAccountMetadata : buyAccountMetadata
        const _address = type === AddressVerificationType.Sell ? sellAddress : buyAddress

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
          setStatus(type, AddressVerificationStatus.Verified)
        } else {
          setStatus(type, AddressVerificationStatus.Error)
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

  const handleBuyVerify = useCallback(() => {
    handleVerify(AddressVerificationType.Buy)
  }, [handleVerify])

  const handleSellVerify = useCallback(() => {
    handleVerify(AddressVerificationType.Sell)
  }, [handleVerify])

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
    if (
      buyAddressVerificationStatus === AddressVerificationStatus.Pending ||
      buyAddressVerificationStatus === AddressVerificationStatus.Error
    ) {
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

    if (
      sellAddressVerificationStatus === AddressVerificationStatus.Pending ||
      sellAddressVerificationStatus === AddressVerificationStatus.Error
    ) {
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
    buyAddressVerificationStatus,
    sellAddressVerificationStatus,
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
                    {buyAddressVerificationStatus === AddressVerificationStatus.Verified && (
                      <CheckCircleIcon ml='auto' boxSize={5} color='text.success' />
                    )}
                    {buyAddressVerificationStatus === AddressVerificationStatus.Error && (
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
                  {sellAddressVerificationStatus === 'verified' && (
                    <CheckCircleIcon ml='auto' boxSize={5} color='text.success' />
                  )}
                  {sellAddressVerificationStatus === 'error' && (
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
              {Boolean(
                buyAddressVerificationErrorMessage || sellAddressVerificationErrorMessage,
              ) ? (
                <RawText>
                  {buyAddressVerificationErrorMessage ?? sellAddressVerificationErrorMessage}
                </RawText>
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
