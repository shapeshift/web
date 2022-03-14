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
import { useEffect, useMemo, useReducer, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { ensReverseLookup } from 'lib/ens'
import { selectPortfolioCryptoMixedBalancesBySymbol } from 'state/slices/selectors'

import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import { FiatRampActionButtons } from '../components/FiatRampActionButtons'
import { FiatRampAction, GemCurrency, SupportedCurrency } from '../FiatRamps'
import { reducer } from '../reducer'
import {
  fetchCoinifySupportedCurrencies,
  fetchWyreSupportedCurrencies,
  getAssetLogoUrl,
  isSupportedBitcoinAsset,
  makeGemPartnerUrl,
  middleEllipsis,
  parseGemBuyAssets,
  parseGemSellAssets
} from '../utils'

export const GemManager = () => {
  const translate = useTranslate()
  const toast = useToast()
  const { fiatRamps } = useModal()

  // TODO: Move to another file

  const initialState = {
    loading: false,
    selectedAsset: null,
    shownOnDisplay: false,
    ethAddress: '',
    btcAddress: '',
    supportsAddressVerifying: false,
    coinifyAssets: [],
    wyreAssets: []
  }
  const [state, dispatch] = useReducer(reducer, initialState)
  // TODO end

  const [isSelectingAsset, setIsSelectingAsset] = useState(false)
  const [action, setAction] = useState<FiatRampAction>(FiatRampAction.Buy)
  const [buyList, setBuyList] = useState<GemCurrency[]>([])
  const [sellList, setSellList] = useState<GemCurrency[]>([])

  const {
    state: { wallet }
  } = useWallet()
  const chainAdapterManager = useChainAdapters()
  const ethChainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
  const btcChainAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)

  const addressOrNameFull =
    isSupportedBitcoinAsset(state.selectedAsset?.ticker) && state.btcAddress
      ? state.btcAddress
      : state.ensName || state.ethAddress

  const addressFull =
    isSupportedBitcoinAsset(state.selectedAsset?.ticker) && state.btcAddress
      ? state.btcAddress
      : state.ethAddress

  const addressOrNameEllipsed =
    isSupportedBitcoinAsset(state.selectedAsset?.ticker) && state.btcAddress
      ? middleEllipsis(state.btcAddress, 11)
      : state.ensName || middleEllipsis(state.ethAddress, 11)

  useEffect(() => {
    ;(async () => {
      const supportsAddressVerifying = Boolean(
        (wallet as KeepKeyHDWallet)._isKeepKey || (wallet as PortisHDWallet)._isPortis
      )

      dispatch({ type: 'SET_SUPPORTS_ADDRESS_VERIFYING', supportsAddressVerifying })
    })()
  }, [wallet])

  const balances = useSelector(selectPortfolioCryptoMixedBalancesBySymbol)

  useEffect(() => {
    ;(async () => {
      if (!wallet) return
      const ethAddress = await ethChainAdapter.getAddress({
        wallet
      })
      const btcAddress = supportsBTC(wallet)
        ? (await btcChainAdapter.getAddress({
            wallet,
            accountType: UtxoAccountType.SegwitNative,
            // Magic segwit native bip44 params
            bip44Params: {
              purpose: 84,
              coinType: 0,
              accountNumber: 0
            }
          })) ?? ''
        : ''

      dispatch({ type: 'SET_ETH_ADDRESS', ethAddress })
      dispatch({ type: 'SET_BTC_ADDRESS', btcAddress })
      const reverseEthAddressLookup = await ensReverseLookup(ethAddress)
      !reverseEthAddressLookup.error &&
        dispatch({ type: 'SET_ENS_NAME', ensName: reverseEthAddressLookup.name })
    })()
  }, [wallet, ethChainAdapter, btcChainAdapter])

  useEffect(() => {
    ;(async () => {
      dispatch({ type: 'FETCH_STARTED' })

      try {
        if (!state.coinifyAssets.length) {
          const coinifyAssets = await fetchCoinifySupportedCurrencies()
          dispatch({ type: 'SET_COINIFY_ASSETS', coinifyAssets })
        }
        if (!state.wyreAssets.length) {
          const wyreAssets = await fetchWyreSupportedCurrencies()
          dispatch({ type: 'SET_WYRE_ASSETS', wyreAssets })
        }
        const buyAssets = parseGemBuyAssets(
          state.coinifyAssets,
          state.wyreAssets,
          balances,
          state.btcAddress
        )
        const sellAssets = parseGemSellAssets(
          state.coinifyAssets,
          state.wyreAssets,
          balances,
          state.btcAddress
        )
        setBuyList(buyAssets)
        setSellList(sellAssets)

        dispatch({ type: 'FETCH_COMPLETED' })
      } catch (e) {
        console.error(e)
        dispatch({ type: 'FETCH_COMPLETED' })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.btcAddress, state.coinifyAssets, state.wyreAssets])

  useEffect(() => dispatch({ type: 'SELECT_ASSET', selectedAsset: null }), [action])

  const [selectAssetTranslation, assetTranslation, fundsTranslation] = useMemo(
    () =>
      action === FiatRampAction.Buy
        ? ['fiatRamps.selectAnAssetToBuy', 'fiatRamps.assetToBuy', 'fiatRamps.fundsTo']
        : ['fiatRamps.selectAnAssetToSell', 'fiatRamps.assetToSell', 'fiatRamps.fundsFrom'],
    [action]
  )

  const onAssetSelect = (data: GemCurrency) => {
    setIsSelectingAsset(false)
    dispatch({ type: 'SELECT_ASSET', selectedAsset: data })
  }

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
    if (!wallet) return
    const adapter =
      isSupportedBitcoinAsset(state.selectedAsset?.ticker) && state.btcAddress
        ? btcChainAdapter
        : ethChainAdapter
    const deviceAddress = await adapter.getAddress({
      wallet,
      ...(isSupportedBitcoinAsset(state.selectedAsset?.ticker) && state.btcAddress
        ? {
            accountType: UtxoAccountType.SegwitNative,
            // Magic segwit native bip44 params
            bip44Params: {
              purpose: 84,
              coinType: 0,
              accountNumber: 0
            }
          }
        : {}),
      showOnDevice: true
    })
    dispatch({
      type: 'SHOW_ON_DISPLAY',
      shownOnDisplay: Boolean(deviceAddress) && deviceAddress === state.ethAddress
    })
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
              onClick={onAssetSelect}
              type={action}
              assets={action === FiatRampAction.Buy ? buyList : sellList}
              loading={state.loading}
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
              {state.selectedAsset ? (
                <Flex alignItems='center'>
                  <AssetIcon src={getAssetLogoUrl(state.selectedAsset)} mr={4} />
                  <Box textAlign='left'>
                    <RawText lineHeight={1}>{state.selectedAsset.name}</RawText>
                    <RawText fontWeight='normal' fontSize='sm' color='gray.500'>
                      {state.selectedAsset?.ticker}
                    </RawText>
                  </Box>
                </Flex>
              ) : (
                <Text translation={selectAssetTranslation} color='gray.500' />
              )}
            </Button>
            {state.selectedAsset && (
              <Flex flexDirection='column'>
                <Text translation={fundsTranslation} color='gray.500'></Text>
                <InputGroup size='md'>
                  <Input pr='4.5rem' value={addressOrNameEllipsed} readOnly />
                  <InputRightElement width={state.supportsAddressVerifying ? '4.5rem' : undefined}>
                    <IconButton
                      icon={<CopyIcon />}
                      aria-label='copy-icon'
                      size='sm'
                      isRound
                      variant='ghost'
                      onClick={handleCopyClick}
                    />
                    {state.supportsAddressVerifying && (
                      <IconButton
                        icon={state.shownOnDisplay ? <CheckIcon /> : <ViewIcon />}
                        onClick={handleVerify}
                        aria-label='check-icon'
                        size='sm'
                        color={
                          state.shownOnDisplay
                            ? 'green.500'
                            : state.shownOnDisplay === false
                            ? 'red.500'
                            : 'gray.500'
                        }
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
              disabled={!state.selectedAsset}
              as='a'
              href={makeGemPartnerUrl(action, state.selectedAsset?.ticker, addressFull)}
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
