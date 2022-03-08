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
import { ChainTypes } from '@shapeshiftoss/types'
import axios from 'axios'
import { getConfig } from 'config'
import { concat, flatten, uniqBy } from 'lodash'
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
import { bnOrZero } from 'lib/bignumber/bignumber'
import { ensReverseLookup } from 'lib/ens'
import { selectPortfolioCryptoHumanBalancesBySymbol } from 'state/slices/selectors'

import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import { getAssetLogoUrl } from '../components/AssetSearch/helpers/getAssetLogoUrl'
import { FiatRampActionButtons } from '../components/FiatRampActionButtons'
import { FiatRampAction, GemCurrency, SupportedCurrency, TransactionDirection } from '../FiatRamps'

const middleEllipsis = (address: string, cut: number) =>
  `${address.slice(0, cut)}...${address.slice(-1 * cut)}`

const GEM_ENV = getConfig().REACT_APP_GEM_ENV
const GEM_API_KEY = getConfig().REACT_APP_GEM_API_KEY
const GEM_URL = getConfig().REACT_APP_GEM_URL

export const GemManager = () => {
  const translate = useTranslate()
  const toast = useToast()
  const { fiatRamps } = useModal()

  const [asset, setAsset] = useState<GemCurrency | null>()
  const [isSelectingAsset, setIsSelectingAsset] = useState(false)
  const [verified, setVerified] = useState<boolean | null>(null)
  const [action, setAction] = useState<FiatRampAction>(FiatRampAction.Buy)
  const [address, setAddress] = useState<string>('')
  const [ensAddress, setEnsAddress] = useState<string>('')
  const { state } = useWallet()
  const wallet = state?.wallet
  const chainAdapterManager = useChainAdapters()
  const ethChainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)

  const [supportsAddressVerifying, setSupportsAddressVerifying] = useState(false)

  useEffect(() => {
    ;(async () => {
      const supportsAddressVerifying = ['Portis', 'KeepKey'].includes(
        (await state?.wallet?.getLabel()) ?? state?.walletInfo?.name ?? ''
      )
      setSupportsAddressVerifying(supportsAddressVerifying)
    })()
  }, [state?.wallet, state?.walletInfo?.name])

  const [loading, setLoading] = useState(false)
  const [buyList, setBuyList] = useState<GemCurrency[]>([])
  const [sellList, setSellList] = useState<GemCurrency[]>([])

  const balances = useSelector(selectPortfolioCryptoHumanBalancesBySymbol)
  const fetchCoinifySupportedCurrencies = async (): Promise<SupportedCurrency[]> => {
    try {
      const { data } = await axios.get(getConfig().REACT_APP_GEM_COINIFY_SUPPORTED_COINS)
      return data
    } catch (e: any) {
      console.error(e)
      return []
    }
  }

  const fetchWyreSupportedCurrencies = async (): Promise<SupportedCurrency[]> => {
    try {
      const { data } = await axios.get(getConfig().REACT_APP_GEM_WYRE_SUPPORTED_COINS)
      return data
    } catch (e: any) {
      console.error(e)
      return []
    }
  }

  const isBuyAsset = (currency: SupportedCurrency) =>
    currency.transaction_direction === TransactionDirection.BankToBlockchain ||
    currency.transaction_direction === TransactionDirection.CardToBlockchain

  const isSellAsset = (currency: SupportedCurrency) =>
    currency.transaction_direction === TransactionDirection.BlockchainToBank

  const filterAndMerge = useMemo(
    () =>
      (
        coinifyList: SupportedCurrency[],
        wyreList: SupportedCurrency[],
        key: 'destination' | 'source',
        filter: (currency: SupportedCurrency) => boolean
      ): GemCurrency[] => {
        const filteredCoinifyList = coinifyList
          .filter(filter)
          .map(coinifyList => coinifyList[key].currencies)
        const filteredWyreList = wyreList.filter(filter).map(wyreList => wyreList[key].currencies)

        const results = uniqBy(
          flatten(concat(filteredCoinifyList, filteredWyreList)),
          'gem_asset_id'
        )
          .map(asset => ({
            ...asset,
            cryptoBalance: bnOrZero(balances[asset.ticker]?.crypto),
            fiatBalance: bnOrZero(balances[asset.ticker]?.fiat)
          }))
          .sort((a, b) =>
            key === 'source' && (a.fiatBalance || b.fiatBalance)
              ? b.fiatBalance.minus(a.fiatBalance).toNumber()
              : a.name.localeCompare(b.name)
          )
        return results
      },
    [balances]
  )

  const fetchSupportedCurrencies = async () => {
    setLoading(true)

    try {
      const coinifyAssets = await fetchCoinifySupportedCurrencies()
      const wyreAssets = await fetchWyreSupportedCurrencies()
      const buyAssets = filterAndMerge(coinifyAssets, wyreAssets, 'destination', isBuyAsset)
      const sellAssets = filterAndMerge(coinifyAssets, wyreAssets, 'source', isSellAsset)
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
  }, [])

  const onSelectAsset = (data: GemCurrency) => {
    setIsSelectingAsset(false)
    setAsset(data)
  }
  useEffect(() => setAsset(null), [action])

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
      wallets: JSON.stringify([{ address, asset: asset?.ticker }])
    })
    return `${GEM_URL}?${queryConfig}`
  }, [address, action, asset])

  const handleCopyClick = async () => {
    const duration = 2500
    const isClosable = true
    const toastPayload = { duration, isClosable }
    try {
      await navigator.clipboard.writeText(address as string)
      const title = translate('common.copied')
      const status = 'success'
      const description = address
      toast({ description, title, status, ...toastPayload })
    } catch (e) {
      const title = translate('common.copyFailed')
      const status = 'error'
      const description = translate('common.copyFailedDescription')
      toast({ description, title, status })
    }
  }

  useEffect(() => {
    ;(async () => {
      if (!(wallet && ethChainAdapter)) return
      const selectedAccountAddress = await ethChainAdapter.getAddress({
        wallet
      })
      setAddress(selectedAccountAddress)
      const reverseSelectedAccountAddressLookup = await ensReverseLookup(selectedAccountAddress)
      !reverseSelectedAccountAddressLookup.error &&
        setEnsAddress(reverseSelectedAccountAddressLookup.name)
    })()
  }, [setAddress, setEnsAddress, wallet, ethChainAdapter])

  const handleVerify = async () => {
    if (!(wallet && ethChainAdapter && address)) return
    const deviceAddress = await ethChainAdapter.getAddress({
      wallet,
      showOnDevice: true
    })
    setVerified(Boolean(deviceAddress) && deviceAddress === address)
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
              {asset ? (
                <Flex alignItems='center'>
                  <AssetIcon src={getAssetLogoUrl(asset)} mr={4} />
                  <Box textAlign='left'>
                    <RawText lineHeight={1}>{asset.name}</RawText>
                    <RawText fontWeight='normal' fontSize='sm' color='gray.500'>
                      {asset.ticker}
                    </RawText>
                  </Box>
                </Flex>
              ) : (
                <Text translation={selectAssetTranslation} color='gray.500' />
              )}
            </Button>
            {asset && (
              <Flex flexDirection='column'>
                <Text translation={fundsTranslation} color='gray.500'></Text>
                <InputGroup size='md'>
                  <Input pr='4.5rem' value={ensAddress || middleEllipsis(address, 11)} readOnly />
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
              disabled={!asset}
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
