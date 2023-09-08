import { CheckIcon, ChevronRightIcon, CopyIcon, ViewIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Select,
  Spinner,
  Stack,
  Text as RawText,
  useColorMode,
  useToast,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCreditCard } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { useGetFiatRampsQuery } from 'state/apis/fiatRamps/fiatRamps'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectPortfolioAccountMetadataByAccountId,
  selectPortfolioUserCurrencyBalanceByFilter,
  selectSelectedCurrency,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FiatRampActionButtons } from '../components/FiatRampActionButtons'
import { FiatRampButton } from '../components/FiatRampButton'
import type { CommonFiatCurrencies, FiatCurrencyItem, FiatRamp } from '../config'
import { supportedFiatRamps } from '../config'
import commonFiatCurrencyList from '../FiatCurrencyList.json'
import { FiatRampAction } from '../FiatRampsCommon'
import { middleEllipsis } from '../utils'

type OverviewProps = {
  accountId: AccountId | undefined
  address: string
  vanityAddress: string
  assetId: AssetId
  defaultAction: FiatRampAction
  handleIsSelectingAsset: (fiatRampAction: FiatRampAction) => void
  handleAccountIdChange: (accountId: AccountId) => void
}

export const Overview: React.FC<OverviewProps> = ({
  handleIsSelectingAsset,
  defaultAction = FiatRampAction.Buy,
  assetId,
  handleAccountIdChange,
  accountId,
  address,
  vanityAddress,
}) => {
  const [fiatRampAction, setFiatRampAction] = useState<FiatRampAction>(defaultAction)
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  const [fiatCurrency, setFiatCurrency] = useState<CommonFiatCurrencies>(selectedCurrency)
  const popup = useModal('popup')
  const selectedLocale = useAppSelector(selectSelectedLocale)
  const { colorMode } = useColorMode()
  const translate = useTranslate()
  const toast = useToast()
  const assets = useAppSelector(selectAssets)
  const {
    state: { wallet, isConnected, isDemoWallet },
    dispatch,
  } = useWallet()

  const [shownOnDisplay, setShownOnDisplay] = useState<Boolean | null>(null)
  useEffect(() => setShownOnDisplay(null), [accountId])

  const filter = useMemo(
    () => ({ assetId: assetId ?? '', accountId: accountId ?? '' }),
    [assetId, accountId],
  )
  const accountMetadata = useAppSelector(s => selectPortfolioAccountMetadataByAccountId(s, filter))
  const accountUserCurrencyBalance = useAppSelector(s =>
    selectPortfolioUserCurrencyBalanceByFilter(s, filter),
  )
  const { data: ramps, isLoading: isRampsLoading } = useGetFiatRampsQuery()

  const isUnsupportedAsset = !Boolean(wallet && isAssetSupportedByWallet(assetId ?? '', wallet))

  const [selectAssetTranslation, assetTranslation, fundsTranslation] = useMemo(
    () =>
      fiatRampAction === FiatRampAction.Buy
        ? ['fiatRamps.selectAnAssetToBuy', 'fiatRamps.asset', 'fiatRamps.fundsTo']
        : ['fiatRamps.selectAnAssetToSell', 'fiatRamps.asset', 'fiatRamps.fundsFrom'],
    [fiatRampAction],
  )

  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

  const handleCopyClick = useCallback(async () => {
    const duration = 2500
    const isClosable = true
    const toastPayload = { duration, isClosable }
    try {
      await navigator.clipboard.writeText(address)
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
  }, [address, toast, translate])

  const supportsAddressVerification = useMemo(() => wallet instanceof KeepKeyHDWallet, [wallet])

  const handleVerify = useCallback(async () => {
    if (!accountId) return
    if (!wallet) return
    if (!address) return
    if (!accountMetadata) return
    const { accountType, bip44Params } = accountMetadata
    const showOnDevice = true
    const { accountNumber } = bip44Params
    const payload = { accountType, accountNumber, wallet, showOnDevice }
    const verifiedAddress = await getChainAdapterManager()
      .get(fromAccountId(accountId).chainId)!
      .getAddress(payload)
    const shownOnDisplay = verifiedAddress === address
    setShownOnDisplay(shownOnDisplay)
  }, [accountId, accountMetadata, address, wallet])

  const handlePopupClick = useCallback(
    ({ rampId, address }: { rampId: FiatRamp; address: string }) => {
      const ramp = supportedFiatRamps[rampId]
      const mpData = {
        action: fiatRampAction,
        assetId: getMaybeCompositeAssetSymbol(assetId, assets),
        ramp: ramp.id,
      }
      getMixPanel()?.track(MixPanelEvents.FiatRamp, mpData)
      const url = ramp.onSubmit({
        action: fiatRampAction,
        assetId,
        address,
        fiatCurrency,
        options: {
          language: selectedLocale,
          mode: colorMode,
          currentUrl: window.location.href,
        },
      })
      if (url) popup.open({ url, title: 'Buy' })
    },
    [assets, assetId, colorMode, fiatCurrency, fiatRampAction, popup, selectedLocale],
  )

  const renderProviders = useMemo(() => {
    if (!assetId) return null
    if (isRampsLoading) return null
    if (!ramps) return null
    const rampIdsForAssetIdAndAction = ramps.byAssetId?.[assetId]?.[fiatRampAction] ?? []
    if (!rampIdsForAssetIdAndAction.length)
      return (
        <Center display='flex' flexDir='column' minHeight='150px'>
          <IconCircle mb={4}>
            <FaCreditCard />
          </IconCircle>
          <Text fontWeight='medium' translation='fiatRamps.noProvidersAvailable' fontSize='lg' />
          <Text translation='fiatRamps.noProvidersBody' color='text.subtle' />
        </Center>
      )
    const listOfRamps = [...rampIdsForAssetIdAndAction]
    return listOfRamps
      .filter(rampId => {
        const list = supportedFiatRamps[rampId].getSupportedFiatList()
        return list.includes(fiatCurrency)
      })
      .sort((a, b) => supportedFiatRamps[a].order - supportedFiatRamps[b].order)
      .map(rampId => {
        const ramp = supportedFiatRamps[rampId]
        const passedAddress = isDemoWallet ? '' : address
        return (
          <FiatRampButton
            key={rampId}
            onClick={() => handlePopupClick({ rampId, address: passedAddress })}
            accountFiatBalance={accountUserCurrencyBalance}
            action={fiatRampAction}
            {...ramp}
          />
        )
      })
  }, [
    accountUserCurrencyBalance,
    address,
    assetId,
    fiatCurrency,
    fiatRampAction,
    handlePopupClick,
    isDemoWallet,
    isRampsLoading,
    ramps,
  ])

  const inputValue = useMemo(() => {
    if (vanityAddress) return vanityAddress
    return address ? middleEllipsis(address, 11) : ''
  }, [address, vanityAddress])

  const renderFiatOptions = useMemo(() => {
    const options: FiatCurrencyItem[] = Object.values(commonFiatCurrencyList)
    return options.map(option => (
      <option key={option.code} value={option.code}>
        {`${option.code} - ${option.name}`}
      </option>
    ))
  }, [])
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  return asset ? (
    <>
      <FiatRampActionButtons action={fiatRampAction} setAction={setFiatRampAction} />
      <Flex display='flex' flexDir='column' gap={6} p={6} bg='background.surface.raised.base'>
        <Stack spacing={4}>
          <Text
            fontWeight='bold'
            translation={
              fiatRampAction === FiatRampAction.Buy ? 'fiatRamps.buyWith' : 'fiatRamps.sellFor'
            }
          />
          <Select
            value={fiatCurrency}
            onChange={e => setFiatCurrency(e.target.value as CommonFiatCurrencies)}
          >
            {renderFiatOptions}
          </Select>
        </Stack>
        <Stack spacing={4}>
          <Box>
            <Text fontWeight='medium' translation={assetTranslation} />
            <Text color='text.subtle' translation='fiatRamps.selectBody' />
          </Box>
          <Button
            width='full'
            variant='outline'
            height='48px'
            justifyContent='space-between'
            onClick={() => handleIsSelectingAsset(fiatRampAction)}
            rightIcon={<ChevronRightIcon color='text.subtle' boxSize={6} />}
          >
            {assetId ? (
              <Flex alignItems='center'>
                <AssetIcon size='sm' assetId={assetId} mr={4} />
                <Box textAlign='left'>
                  <RawText lineHeight={1}>{asset.name}</RawText>
                </Box>
              </Flex>
            ) : (
              <Text translation={selectAssetTranslation} color='text.subtle' />
            )}
          </Button>
          <Flex flexDirection='column' mb='10px'>
            <Text
              translation={
                isUnsupportedAsset
                  ? ['fiatRamps.notSupported', { asset: asset.symbol, wallet: wallet?.getVendor() }]
                  : fundsTranslation
              }
              color='text.subtle'
              mt='15px'
              mb='8px'
            />
            {isConnected && !isDemoWallet ? (
              <>
                {isUnsupportedAsset ? (
                  <Button
                    data-test='fiatramp-connect-wallet-button'
                    onClick={handleWalletModalOpen}
                  >
                    {translate('connectWallet.menu.switchWallet')}
                  </Button>
                ) : (
                  <>
                    <AccountDropdown
                      autoSelectHighestBalance={true}
                      assetId={assetId}
                      onChange={handleAccountIdChange}
                      defaultAccountId={accountId}
                      buttonProps={{ variant: 'solid', width: 'full' }}
                      boxProps={{ px: 0 }}
                    />
                    <InputGroup size='md'>
                      <Input
                        pr='4.5rem'
                        value={inputValue}
                        readOnly
                        placeholder={!address ? translate('common.loadingText') : ''}
                      />
                      {!address && <InputLeftElement children={<Spinner size='sm' />} />}
                      {address && (
                        <InputRightElement
                          width={supportsAddressVerification ? '4.5rem' : undefined}
                        >
                          <IconButton
                            icon={<CopyIcon />}
                            aria-label='copy-icon'
                            size='sm'
                            isRound
                            variant='ghost'
                            onClick={handleCopyClick}
                          />
                          {supportsAddressVerification && address && (
                            <IconButton
                              icon={shownOnDisplay ? <CheckIcon /> : <ViewIcon />}
                              onClick={handleVerify}
                              aria-label='check-icon'
                              size='sm'
                              color={
                                shownOnDisplay
                                  ? 'green.500'
                                  : shownOnDisplay === false
                                  ? 'red.500'
                                  : 'text.subtle'
                              }
                              isRound
                              variant='ghost'
                            />
                          )}
                        </InputRightElement>
                      )}
                    </InputGroup>
                  </>
                )}
              </>
            ) : (
              <Button data-test='fiatramp-connect-wallet-button' onClick={handleWalletModalOpen}>
                {translate('common.connectWallet')}
              </Button>
            )}
          </Flex>
        </Stack>
        <Stack spacing={4}>
          {ramps && (
            <Box>
              <Text fontWeight='medium' translation='fiatRamps.availableProviders' />
              <Text
                color='text.subtle'
                translation={[
                  'fiatRamps.titleMessage',
                  {
                    action: translate(`fiatRamps.${fiatRampAction}`).toLocaleLowerCase(),
                    asset: asset.symbol,
                  },
                ]}
              />
            </Box>
          )}
          {isRampsLoading ? (
            <Center minHeight='150px'>
              <CircularProgress />
            </Center>
          ) : (
            <Stack>{renderProviders}</Stack>
          )}
        </Stack>
      </Flex>
    </>
  ) : null
}
