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
import { CHAIN_NAMESPACE, fromAccountId, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { bnOrZero } from '@shapeshiftoss/utils'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { WithBackButton } from '../WithBackButton'

import { AssetIcon } from '@/components/AssetIcon'
import { useAccountIds } from '@/components/MultiHopTrade/hooks/useAccountIds'
import { getReceiveAddress } from '@/components/MultiHopTrade/hooks/useReceiveAddress'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText, Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { fromBaseUnit } from '@/lib/math'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { useIsSweepNeededQuery } from '@/pages/Lending/hooks/useIsSweepNeededQuery'
import {
  selectAccountIdsByChainIdFilter,
  selectAccountNumberByAccountId,
  selectPortfolioAccountMetadataByAccountId,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from '@/state/slices/selectors'
import {
  selectInputBuyAsset,
  selectInputSellAmountCryptoBaseUnit,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectManualReceiveAddress,
} from '@/state/slices/tradeInputSlice/selectors'
import { selectFirstHop } from '@/state/slices/tradeQuoteSlice/selectors'
import { store, useAppSelector } from '@/state/store'

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
  const navigate = useNavigate()
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

  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const sellAssetBalanceFilter = useMemo(
    () => ({ assetId: sellAsset.assetId, accountId: sellAssetAccountId }),
    [sellAssetAccountId, sellAsset.assetId],
  )
  const balanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, sellAssetBalanceFilter),
  )

  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)

  const sellAmountCryptoBaseUnit = useAppSelector(selectInputSellAmountCryptoBaseUnit)

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

  const getHasEnoughBalanceForTxPlusFees = useCallback(
    ({
      balanceCryptoBaseUnit,
      amountCryptoPrecision,
      txFeeCryptoBaseUnit,
      precision,
    }: {
      balanceCryptoBaseUnit: string
      amountCryptoPrecision: string
      txFeeCryptoBaseUnit: string
      precision: number
    }) => {
      const balanceCryptoBaseUnitBn = bnOrZero(balanceCryptoBaseUnit)
      if (balanceCryptoBaseUnitBn.isZero()) return false

      return bnOrZero(amountCryptoPrecision)
        .plus(fromBaseUnit(txFeeCryptoBaseUnit, precision ?? 0))
        .lte(fromBaseUnit(balanceCryptoBaseUnitBn, precision))
    },
    [],
  )

  const { data: fromAddress } = useQuery({
    queryKey: ['swapRelayUtxoAddress', sellAssetAccountId, sellAmountCryptoBaseUnit],
    queryFn:
      wallet && sellAccountMetadata && sellAssetAccountId && sellAmountCryptoBaseUnit
        ? async () => {
            if (!sellAccountMetadata) throw new Error('No account metadata found')
            if (!sellAssetAccountId) throw new Error('No sell account id found')

            const bip44Params = sellAccountMetadata.bip44Params
            const accountType = sellAccountMetadata.accountType
            const chainId = fromAssetId(sellAsset.assetId).chainId
            const sellAccountNumber = selectAccountNumberByAccountId(store.getState(), {
              accountId: sellAssetAccountId,
            })

            if (sellAccountNumber === undefined) throw new Error('No sell account number found')
            if (!accountType) throw new Error('No account type found')

            const sellAssetChainAdapter = assertGetUtxoChainAdapter(chainId)

            const xpub = (
              await sellAssetChainAdapter.getPublicKey(wallet, sellAccountNumber, accountType)
            ).xpub

            const account = await sellAssetChainAdapter.getAccount(xpub)

            if (!account.chainSpecific.addresses) throw new Error('No addresses found')

            const addressWithEnoughBalance = account.chainSpecific.addresses.find(address => {
              return bnOrZero(address.balance).gte(sellAmountCryptoBaseUnit)
            })

            if (!addressWithEnoughBalance) {
              const nextReceiveAddress = await sellAssetChainAdapter.getAddress({
                wallet,
                accountNumber: bip44Params.accountNumber,
                accountType,
                pubKey:
                  isLedger(wallet) && sellAssetAccountId
                    ? fromAccountId(sellAssetAccountId).account
                    : undefined,
              })

              return nextReceiveAddress
            }

            return addressWithEnoughBalance?.pubkey
          }
        : skipToken,
  })

  const isSweepNeededArgs = useMemo(
    () => ({
      assetId: sellAsset.assetId,
      address: fromAddress,
      amountCryptoBaseUnit: sellAmountCryptoPrecision,
      txFeeCryptoBaseUnit: tradeQuoteStep?.feeData?.networkFeeCryptoBaseUnit,
      // Don't fetch sweep needed if there isn't enough balance for the tx + fees, since adding in a sweep Tx would obviously fail too
      enabled: Boolean(
        fromAddress &&
          bnOrZero(sellAmountCryptoPrecision).gt(0) &&
          tradeQuoteStep?.feeData?.networkFeeCryptoBaseUnit &&
          getHasEnoughBalanceForTxPlusFees({
            precision: sellAsset.precision,
            balanceCryptoBaseUnit,
            amountCryptoPrecision: sellAmountCryptoPrecision,
            txFeeCryptoBaseUnit: tradeQuoteStep?.feeData?.networkFeeCryptoBaseUnit,
          }),
      ),
    }),
    [
      balanceCryptoBaseUnit,
      fromAddress,
      getHasEnoughBalanceForTxPlusFees,
      sellAmountCryptoPrecision,
      sellAsset.precision,
      tradeQuoteStep?.feeData?.networkFeeCryptoBaseUnit,
      sellAsset.assetId,
    ],
  )

  const { data: isSweepNeeded, isLoading: isSweepNeededLoading } =
    useIsSweepNeededQuery(isSweepNeededArgs)

  useEffect(() => {
    if (!shouldVerifyBuyAddress) {
      setBuyAddressVerificationStatus(AddressVerificationStatus.NotRequired)
    }
  }, [shouldVerifyBuyAddress])

  const handleContinue = useCallback(() => {
    if (isSweepNeeded) {
      return navigate({ pathname: '/trade/sweep' })
    }

    navigate({ pathname: '/trade/confirm' })
  }, [navigate, isSweepNeeded])

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

    const fetchedOrManualBuyAddress = await (() => {
      if (!shouldVerifyBuyAddress) return maybeManualReceiveAddress

      if (!buyAssetAccountId || !buyAccountMetadata) throw new Error('Missing buy account metadata')

      return getReceiveAddress({
        asset: buyAsset,
        wallet,
        deviceId,
        accountMetadata: buyAccountMetadata,
        pubKey: fromAccountId(buyAssetAccountId).account,
      })
    })()

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
      <Button
        onClick={handleContinue}
        isLoading={isSweepNeededLoading}
        isDisabled={isSweepNeededLoading}
        size='lg'
        colorScheme='blue'
        width='full'
      >
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
    isSweepNeededLoading,
  ])

  const handleBack = useCallback(() => {
    navigate(TradeRoutePaths.Input)
  }, [navigate])

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
