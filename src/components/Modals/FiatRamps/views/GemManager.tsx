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
import { ensReverseLookup } from 'lib/ens'
import { selectPortfolioCryptoHumanBalancesBySymbol } from 'state/slices/selectors'

import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import { getAssetLogoUrl } from '../components/AssetSearch/helpers/getAssetLogoUrl'
import { FiatRampActionButtons } from '../components/FiatRampActionButtons'
import {
  CurrencyAsset,
  FiatRampAction,
  SupportedCurrency,
  TransactionDirection
} from '../FiatRamps'

const middleEllipsis = (address: string, cut: number) =>
  `${address.slice(0, cut)}...${address.slice(-1 * cut)}`

const GEM_ENV = getConfig().REACT_APP_GEM_ENV
const GEM_API_KEY = getConfig().REACT_APP_GEM_API_KEY
const GEM_URL = getConfig().REACT_APP_GEM_URL

export const GemManager = () => {
  const translate = useTranslate()
  const toast = useToast()
  const { fiatRamps } = useModal()

  const [asset, setAsset] = useState<CurrencyAsset | null>()
  const [isSelectingAsset, setIsSelectingAsset] = useState(false)
  const [verified, setVerified] = useState<boolean | null>(null)
  const [action, setAction] = useState<FiatRampAction>(FiatRampAction.Buy)
  const [address, setAddress] = useState<string>('')
  const [ensAddress, setEnsAddress] = useState<string>('')
  const { state } = useWallet()
  const wallet = state?.wallet
  const chain = ChainTypes.Ethereum
  const chainAdapterManager = useChainAdapters()
  const chainAdapter = chainAdapterManager.byChain(chain)

  const [loading, setLoading] = useState(false)
  const [buyList, setBuyList] = useState<CurrencyAsset[]>([])
  const [sellList, setSellList] = useState<CurrencyAsset[]>([])

  const balances = useSelector(selectPortfolioCryptoHumanBalancesBySymbol)
  const getCoinifySupportedCurrencies: () => Promise<SupportedCurrency[]> = async () => {
    try {
      const { data } = await axios.get(getConfig().REACT_APP_GEM_COINIFY_SUPPORTED_COINS)
      return data
    } catch (e: any) {
      console.error(e)
    }
  }

  const getWyreSupportedCurrencies: () => Promise<SupportedCurrency[]> = async () => {
    try {
      const { data } = await axios.get(getConfig().REACT_APP_GEM_WYRE_SUPPORTED_COINS)
      return data
    } catch (e: any) {
      console.error(e)
    }
  }

  const buyFilter = (currency: SupportedCurrency) =>
    currency.transaction_direction === TransactionDirection.BankToBlockchain ||
    currency.transaction_direction === TransactionDirection.CardToBlockchain

  const sellFilter = (currency: SupportedCurrency) =>
    currency.transaction_direction === TransactionDirection.BlockchainToBank

  const filterAndMerge = useMemo(
    () =>
      (
        coinifyList: SupportedCurrency[],
        wyreList: SupportedCurrency[],
        key: 'destination' | 'source',
        filter: (currency: SupportedCurrency) => boolean
      ): CurrencyAsset[] => {
        const list1 = coinifyList.filter(filter).map(list => list[key].currencies)
        const list2 = wyreList.filter(filter).map(list => list[key].currencies)
        const results = uniqBy(flatten(concat(list1, list2)), 'gem_asset_id')
          .map(result => ({
            ...result,
            cryptoBalance: Number(balances[result.ticker]?.crypto) || 0,
            fiatBalance: Number(balances[result.ticker]?.fiat) || 0
          }))
          .sort(key === 'source' ? (a, b) => b.fiatBalance - a.fiatBalance : undefined)
        return results
      },
    [balances]
  )

  const fetchSupportedCurrencies = async () => {
    setLoading(true)

    try {
      const coinifyList = await getCoinifySupportedCurrencies()
      const wyreList = await getWyreSupportedCurrencies()
      const buyList = filterAndMerge(coinifyList, wyreList, 'destination', buyFilter)
      const sellList = filterAndMerge(coinifyList, wyreList, 'source', sellFilter)
      setBuyList(buyList)
      setSellList(sellList)
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

  const onSelectAsset = (data: CurrencyAsset) => {
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

  const gemUrl = useMemo(() => {
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

  const copyHandler = async () => {
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
      if (!(wallet && chainAdapter)) return
      const selectedAccountAddress = await chainAdapter.getAddress({
        wallet
      })
      setAddress(selectedAccountAddress)
      const reverseSelectedAccountAddressLookup = await ensReverseLookup(selectedAccountAddress)
      !reverseSelectedAccountAddressLookup.error &&
        setEnsAddress(reverseSelectedAccountAddressLookup.name)
    })()
  }, [setAddress, setEnsAddress, wallet, chainAdapter, chain])

  const handleVerify = async () => {
    if (!(wallet && chainAdapter && address)) return
    const deviceAddress = await chainAdapter.getAddress({
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
                  <InputRightElement width='4.5rem'>
                    <IconButton
                      icon={<CopyIcon />}
                      aria-label='copy-icon'
                      size='sm'
                      isRound
                      variant='ghost'
                      onClick={copyHandler}
                    />
                    <IconButton
                      icon={verified ? <CheckIcon /> : <ViewIcon />}
                      onClick={handleVerify}
                      aria-label='check-icon'
                      size='sm'
                      color={verified ? 'green.500' : verified === false ? 'red.500' : 'gray.500'}
                      isRound
                      variant='ghost'
                    />
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
              href={gemUrl}
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
