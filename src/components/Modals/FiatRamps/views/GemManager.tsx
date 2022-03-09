import { ArrowBackIcon, CheckIcon, ChevronRightIcon, CopyIcon, ViewIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Text as RawText,
  useToast
} from '@chakra-ui/react'
import { supportsBTC } from '@shapeshiftoss/hdwallet-core'
import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { PortisHDWallet } from '@shapeshiftoss/hdwallet-portis'
import { ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import queryString from 'querystring'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { ensReverseLookup } from 'lib/ens'
import { selectPortfolioCryptoHumanBalancesBySymbol } from 'state/slices/selectors'

import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import { FiatRampActionButtons } from '../components/FiatRampActionButtons'
import { FiatRampAction, GemCurrency, SupportedCurrency } from '../FiatRamps'
import {
  fetchCoinifySupportedCurrencies,
  fetchWyreSupportedCurrencies,
  filterAndMerge,
  getAssetLogoUrl,
  isBuyAsset,
  isSellAsset,
  isSupportedBitcoinAsset
} from '../utils'

const middleEllipsis = (address: string, cut: number) =>
  `${address.slice(0, cut)}...${address.slice(-1 * cut)}`

const GEM_ENV = getConfig().REACT_APP_GEM_ENV
const GEM_API_KEY = getConfig().REACT_APP_GEM_API_KEY
const GEM_URL = getConfig().REACT_APP_GEM_URL

export const GemManager = () => {
  const translate = useTranslate()
  const toast = useToast()
  const { fiatRamps } = useModal()

  const [selectedAsset, setSelectedAsset] = useState<GemCurrency | null>()
  const [isSelectingAsset, setIsSelectingAsset] = useState(false)
  const [verified, setVerified] = useState<boolean | null>(null)
  const [action, setAction] = useState<FiatRampAction>(FiatRampAction.Buy)
  const [ethAddress, setEthAddress] = useState<string>('')
  const [btcAddress, setBtcAddress] = useState<string>('')
  const [ensAddress, setEnsAddress] = useState<string>('')
  const [supportsAddressVerifying, setSupportsAddressVerifying] = useState(false)
  const [coinifyAssets, setCoinifyAssets] = useState<SupportedCurrency[]>([])
  const [wyreAssets, setWyreAssets] = useState<SupportedCurrency[]>([])
  const { state } = useWallet()
  const wallet = state?.wallet
  const chainAdapterManager = useChainAdapters()
  const ethChainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
  const btcChainAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)

  const addressOrNameFull =
    isSupportedBitcoinAsset(selectedAsset?.ticker) && btcAddress
      ? btcAddress
      : ensAddress || ethAddress

  const addressFull =
    isSupportedBitcoinAsset(selectedAsset?.ticker) && btcAddress ? btcAddress : ethAddress

  const addressOrNameEllipsed =
    isSupportedBitcoinAsset(selectedAsset?.ticker) && btcAddress
      ? middleEllipsis(btcAddress, 11)
      : ensAddress || middleEllipsis(ethAddress, 11)

  useEffect(() => {
    ;(async () => {
      const supportsAddressVerifying = Boolean(
        (wallet as KeepKeyHDWallet)._isKeepKey || (wallet as PortisHDWallet)._isPortis
      )
      setSupportsAddressVerifying(supportsAddressVerifying)
    })()
  }, [wallet])

  const [loading, setLoading] = useState(false)
  const [buyList, setBuyList] = useState<GemCurrency[]>([])
  const [sellList, setSellList] = useState<GemCurrency[]>([])

  const balances = useSelector(selectPortfolioCryptoHumanBalancesBySymbol)

  useEffect(() => {
    ;(async () => {
      if (!(wallet && ethChainAdapter)) return
      const ethAddress = await ethChainAdapter.getAddress({
        wallet
      })
      const btcAddress = supportsBTC(wallet)
        ? (await btcChainAdapter.getAddress({
            wallet,
            accountType: UtxoAccountType.SegwitNative,
            bip44Params: {
              purpose: 84,
              coinType: 0,
              accountNumber: 0
            }
          })) ?? ''
        : ''

      setEthAddress(ethAddress)
      setBtcAddress(btcAddress)
      const reverseEthAddressLookup = await ensReverseLookup(ethAddress)
      !reverseEthAddressLookup.error && setEnsAddress(reverseEthAddressLookup.name)
    })()
  }, [setEthAddress, setEnsAddress, wallet, ethChainAdapter, btcChainAdapter])

  const fetchSupportedCurrencies = async () => {
    setLoading(true)

    try {
      if (!coinifyAssets.length) {
        const coinifyAssets = await fetchCoinifySupportedCurrencies()
        setCoinifyAssets(coinifyAssets)
      }
      if (!wyreAssets.length) {
        const wyreAssets = await fetchWyreSupportedCurrencies()
        setWyreAssets(wyreAssets)
      }
      const buyAssets = filterAndMerge(
        coinifyAssets,
        wyreAssets,
        'destination',
        isBuyAsset,
        balances,
        btcAddress
      )
      const sellAssets = filterAndMerge(
        coinifyAssets,
        wyreAssets,
        'source',
        isSellAsset,
        balances,
        btcAddress
      )
      setBuyList(buyAssets)
      setSellList(sellAssets)
      setLoading(false)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      await fetchSupportedCurrencies()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [btcAddress, coinifyAssets, wyreAssets])

  const onSelectAsset = (data: GemCurrency) => {
    setIsSelectingAsset(false)
    setSelectedAsset(data)
  }
  useEffect(() => setSelectedAsset(null), [action])

  const [selectAssetTranslation, assetTranslation, fundsTranslation] = useMemo(
    () =>
      action === FiatRampAction.Buy
        ? ['fiatRamps.selectAnAssetToBuy', 'fiatRamps.assetToBuy', 'fiatRamps.fundsTo']
        : ['fiatRamps.selectAnAssetToSell', 'fiatRamps.assetToSell', 'fiatRamps.fundsFrom'],
    [action]
  )

  const gemPartnerUrl = useMemo(() => {
    const onrampConfig = {
      partnerName: 'ShapeShift',
      environment: GEM_ENV,
      partnerIconUrl:
        'https://portis-prod.s3.amazonaws.com/assets/dapps-logo/191330a6-d761-4312-9fa5-7f0024483302.png',
      apiKey: GEM_API_KEY
    }
    const queryConfig = queryString.stringify({
      ...onrampConfig,
      intent: action,
      wallets: JSON.stringify([{ address: addressFull, asset: selectedAsset?.ticker }])
    })
    return `${GEM_URL}?${queryConfig}`
  }, [action, selectedAsset, addressFull])

  const handleCopyClick = async () => {
    const duration = 2500
    const isClosable = true
    const toastPayload = { duration, isClosable }
    try {
      await navigator.clipboard.writeText(addressOrNameFull as string)
      const title = translate('common.copied')
      const status = 'success'
      const description = addressOrNameFull
      toast({ description, title, status, ...toastPayload })
    } catch (e) {
      const title = translate('common.copyFailed')
      const status = 'error'
      const description = translate('common.copyFailedDescription')
      toast({ description, title, status })
    }
  }

  const handleVerify = async () => {
    if (!(wallet && ethChainAdapter)) return
    const deviceAddress = await ethChainAdapter.getAddress({
      wallet,
      showOnDevice: true
    })
    setVerified(Boolean(deviceAddress) && deviceAddress === ethAddress)
  }

  return (
    <SlideTransition>
      <Box m={4} width={'24rem'}>
        {isSelectingAsset ? (
          <Stack>
            <Flex>
              <IconButton
                icon={<ArrowBackIcon />}
                aria-label={selectAssetTranslation}
                size='sm'
                onClick={() => setIsSelectingAsset(false)}
                isRound
                variant='ghost'
                mr={2}
              />
              <Text alignSelf='center' translation={selectAssetTranslation} />
            </Flex>
            <AssetSearch
              onClick={onSelectAsset}
              type={action}
              assets={action === FiatRampAction.Buy ? buyList : sellList}
              loading={loading}
            />
          </Stack>
        ) : (
          <Stack spacing={4}>
            <FiatRampActionButtons action={action} setAction={setAction} />
            <Text translation={assetTranslation} color='gray.500' />
            <Button
              width='full'
              colorScheme='gray'
              justifyContent='space-between'
              height='70px'
              onClick={() => setIsSelectingAsset(true)}
              rightIcon={<ChevronRightIcon color='gray.500' boxSize={6} />}
            >
              {selectedAsset ? (
                <Flex alignItems='center'>
                  <AssetIcon src={getAssetLogoUrl(selectedAsset)} mr={4} />
                  <Box textAlign='left'>
                    <RawText lineHeight={1}>{selectedAsset.name}</RawText>
                    <RawText fontWeight='normal' fontSize='sm' color='gray.500'>
                      {selectedAsset?.ticker}
                    </RawText>
                  </Box>
                </Flex>
              ) : (
                <Text translation={selectAssetTranslation} color='gray.500' />
              )}
            </Button>
            {selectedAsset && (
              <Flex flexDirection='column'>
                <Text translation={fundsTranslation} color='gray.500'></Text>
                <InputGroup size='md'>
                  <Input pr='4.5rem' value={addressOrNameEllipsed} readOnly />
                  <InputRightElement width={supportsAddressVerifying ? '4.5rem' : undefined}>
                    <IconButton
                      icon={<CopyIcon />}
                      aria-label='copy-icon'
                      size='sm'
                      isRound
                      variant='ghost'
                      onClick={handleCopyClick}
                    />
                    {supportsAddressVerifying && (
                      <IconButton
                        icon={verified ? <CheckIcon /> : <ViewIcon />}
                        onClick={handleVerify}
                        aria-label='check-icon'
                        size='sm'
                        color={verified ? 'green.500' : verified === false ? 'red.500' : 'gray.500'}
                        isRound
                        variant='ghost'
                      />
                    )}
                  </InputRightElement>
                </InputGroup>
              </Flex>
            )}
            <Button
              width='full'
              size='lg'
              colorScheme='blue'
              disabled={!selectedAsset}
              as='a'
              href={gemPartnerUrl}
              target='_blank'
            >
              <Text translation='common.continue' />
            </Button>
            <Button width='full' size='lg' variant='ghost' onClick={fiatRamps.close}>
              <Text translation='common.cancel' />
            </Button>
          </Stack>
        )}
      </Box>
    </SlideTransition>
  )
}
