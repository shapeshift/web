import { CheckIcon, ChevronRightIcon, CopyIcon, ViewIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  ModalBody,
  Stack,
  Text as RawText,
  useToast,
} from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import {
  CHAIN_NAMESPACE,
  ethChainId,
  fromAccountId,
  fromAssetId,
  fromChainId,
} from '@shapeshiftoss/caip'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { FaCreditCard } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useParams } from 'react-router'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectMarketDataById,
  selectPortfolioAccountBalances,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { FiatRampActionButtons } from '../components/FiatRampActionButtons'
import { FiatRampButton } from '../components/FiatRampButton'
import type { FiatRampAsset } from '../FiatRampsCommon'
import { FiatRampAction } from '../FiatRampsCommon'
import { useFiatRampByAssetId } from '../hooks/useFiatRampByAssetId'
import { middleEllipsis } from '../utils'
import type { AddressByAccountId } from './Manager'

type GenerateAddressProps = {
  accountId: Nullable<AccountId>
  addressByAccountId: AddressByAccountId
  selectedAsset: FiatRampAsset | null
  ensName: string
}

type OverviewProps = GenerateAddressProps & {
  supportsAddressVerifying: boolean
  setSupportsAddressVerifying: Dispatch<SetStateAction<boolean>>
  onFiatRampActionClick: (fiatRampAction: FiatRampAction) => void
  onIsSelectingAsset: (asset: FiatRampAsset | null, selectAssetTranslation: string) => void
  chainId: ChainId
  setChainId: Dispatch<SetStateAction<ChainId>>
  handleAccountIdChange: (accountId: AccountId) => void
  accountId: Nullable<AccountId>
}

type AddressOrNameFull = string
type AddressFull = string
type AddressOrNameEllipsed = string
type GenerateAddressesReturn = [AddressOrNameFull, AddressFull, AddressOrNameEllipsed]
type GenerateAddresses = (props: GenerateAddressProps) => GenerateAddressesReturn

const generateAddresses: GenerateAddresses = props => {
  const { accountId, addressByAccountId, selectedAsset, ensName } = props
  const assetId = selectedAsset?.assetId
  const empty: GenerateAddressesReturn = ['', '', '']
  if (!assetId) return empty
  if (!accountId) return empty
  const address = addressByAccountId[accountId]
  if (!address) return empty
  const chainId = fromAssetId(assetId).chainId
  switch (chainId) {
    case ethChainId:
      return [ensName || address, address, ensName || middleEllipsis(address, 11)]
    default:
      return [address, address, middleEllipsis(address, 11)]
  }
}

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'Views', 'Overview'],
})

export const Overview: React.FC<OverviewProps> = ({
  onIsSelectingAsset,
  onFiatRampActionClick,
  supportsAddressVerifying,
  setSupportsAddressVerifying,
  ensName,
  selectedAsset,
  chainId,
  setChainId,
  handleAccountIdChange,
  accountId,
  addressByAccountId,
}) => {
  const translate = useTranslate()
  const { fiatRampAction } = useParams<{ fiatRampAction: FiatRampAction }>()
  const toast = useToast()
  const {
    state: { wallet },
  } = useWallet()
  const multiAccountsEnabled = useFeatureFlag('MultiAccounts')
  const [shownOnDisplay, setShownOnDisplay] = useState<Boolean | null>(null)
  const accountBalances = useAppSelector(selectPortfolioAccountBalances)
  const marketData = useAppSelector(state =>
    selectMarketDataById(state, selectedAsset?.assetId ?? ''),
  )

  const filter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const accountMetadata = useAppSelector(s => selectPortfolioAccountMetadataByAccountId(s, filter))
  const [accountAddress, setAccountAddress] = useState<string | null>(null)
  const { providers, loading: providersLoading } = useFiatRampByAssetId({
    assetId: selectedAsset?.assetId,
    action: fiatRampAction,
  })

  useEffect(() => {
    if (!(wallet && accountId && selectedAsset && accountMetadata)) return
    const { chainId: assetChainId } = fromAssetId(selectedAsset.assetId)
    const { chainId: accountChainId } = fromAccountId(accountId)
    // race condition between selected asset and selected account
    if (assetChainId !== accountChainId) return
    const chainAdapter = getChainAdapterManager().get(assetChainId)
    if (!chainAdapter) return
    const { accountType, bip44Params } = accountMetadata
    if (!bip44Params) return
    const { chainNamespace } = fromChainId(accountChainId)
    // TODO(0xdef1cafe): https://github.com/shapeshift/lib/pull/1015
    if (CHAIN_NAMESPACE.Utxo === chainNamespace && !accountType) return
    ;(async () => {
      try {
        const selectedAccountAddress = await chainAdapter.getAddress({
          wallet,
          accountType,
          bip44Params,
        })
        setAccountAddress(selectedAccountAddress)
      } catch (error) {
        moduleLogger.error(error, 'Error getting address')
      }
    })()
  }, [wallet, selectedAsset, accountId, accountMetadata])

  const accountFiatBalance = useMemo(
    () =>
      bnOrZero(
        multiAccountsEnabled
          ? accountId && accountBalances[accountId][selectedAsset?.assetId ?? '']
          : selectedAsset?.cryptoBalance,
      ).times(marketData.price),
    [
      accountBalances,
      accountId,
      marketData.price,
      multiAccountsEnabled,
      selectedAsset?.assetId,
      selectedAsset?.cryptoBalance,
    ],
  )

  // TODO(0xdef1cafe): useCallback
  const [addressOrNameFull, addressFull, addressOrNameEllipsed] = generateAddresses({
    accountId,
    addressByAccountId,
    ensName,
    selectedAsset,
  })

  useEffect(() => {
    if (!wallet) return
    supportsAddressVerifying && setSupportsAddressVerifying(true)
    const maybeAssetId = selectedAsset?.assetId
    const chainId = maybeAssetId ? fromAssetId(maybeAssetId).chainId : ethChainId
    setChainId(chainId)
    // supportsAddressVerifying will cause infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsset, setChainId, setSupportsAddressVerifying, wallet])

  const [selectAssetTranslation, assetTranslation, fundsTranslation] = useMemo(
    () =>
      fiatRampAction === FiatRampAction.Buy
        ? ['fiatRamps.selectAnAssetToBuy', 'fiatRamps.asset', 'fiatRamps.fundsTo']
        : ['fiatRamps.selectAnAssetToSell', 'fiatRamps.asset', 'fiatRamps.fundsFrom'],
    [fiatRampAction],
  )

  const handleCopyClick = async () => {
    const duration = 2500
    const isClosable = true
    const toastPayload = { duration, isClosable }
    try {
      await navigator.clipboard.writeText(addressOrNameFull)
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

  // TODO(0xdef1cafe): useCallback
  const handleVerify = async () => {
    const chainAdapter = getChainAdapterManager().get(chainId)
    if (!accountId) return
    if (!wallet) return
    if (!chainAdapter) return
    const address = addressByAccountId[accountId]
    if (!address) return
    if (!accountMetadata) return
    const { accountType, bip44Params } = accountMetadata
    const showOnDevice = true
    const payload = { accountType, bip44Params, wallet, showOnDevice }
    const verifiedAddress = await chainAdapter.getAddress(payload)
    const shownOnDisplay = verifiedAddress === address
    setShownOnDisplay(shownOnDisplay)
  }

  const renderProviders = useMemo(() => {
    return providers.length ? (
      providers.map(provider => (
        <FiatRampButton
          onClick={() =>
            provider.onSubmit(
              fiatRampAction,
              selectedAsset?.assetId || '',
              (multiAccountsEnabled ? accountAddress : addressFull) || '',
            )
          }
          accountFiatBalance={accountFiatBalance}
          action={fiatRampAction}
          {...provider}
        />
      ))
    ) : (
      <Center display='flex' flexDir='column' minHeight='150px'>
        <IconCircle mb={4}>
          <FaCreditCard />
        </IconCircle>
        <Text fontWeight='medium' translation='fiatRamps.noProvidersAvailable' fontSize='lg' />
        <Text translation='fiatRamps.noProvidersBody' color='gray.500' />
      </Center>
    )
  }, [
    accountAddress,
    accountFiatBalance,
    addressFull,
    fiatRampAction,
    multiAccountsEnabled,
    providers,
    selectedAsset?.assetId,
  ])

  return (
    <>
      <DefiModalHeader title={translate('fiatRamps.title')} />
      <FiatRampActionButtons action={fiatRampAction} setAction={onFiatRampActionClick} />
      <ModalBody display='flex' flexDir='column' gap={6} py={6}>
        <Stack spacing={4}>
          <Box>
            <Text fontWeight='medium' translation={assetTranslation} />
            <Text color='gray.500' translation='fiatRamps.selectBody' />
          </Box>
          <Button
            width='full'
            variant='outline'
            height='48px'
            justifyContent='space-between'
            onClick={() => onIsSelectingAsset(selectedAsset, selectAssetTranslation)}
            rightIcon={<ChevronRightIcon color='gray.500' boxSize={6} />}
          >
            {selectedAsset ? (
              <Flex alignItems='center'>
                <AssetIcon size='sm' assetId={selectedAsset.assetId} mr={4} />
                <Box textAlign='left'>
                  <RawText lineHeight={1}>{selectedAsset.name}</RawText>
                </Box>
              </Flex>
            ) : (
              <Text translation={selectAssetTranslation} color='gray.500' />
            )}
          </Button>
          {selectedAsset && (
            <Flex flexDirection='column' mb='10px'>
              <Text translation={fundsTranslation} color='gray.500' mt='15px' mb='8px' />
              <AccountDropdown
                assetId={selectedAsset.assetId}
                onChange={handleAccountIdChange}
                buttonProps={{ variant: 'solid', width: 'full' }}
                boxProps={{ px: 0 }}
              />
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
                      icon={shownOnDisplay ? <CheckIcon /> : <ViewIcon />}
                      onClick={handleVerify}
                      aria-label='check-icon'
                      size='sm'
                      color={
                        shownOnDisplay
                          ? 'green.500'
                          : shownOnDisplay === false
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
        </Stack>
        {selectedAsset && (
          <Stack spacing={4}>
            {providers.length && (
              <Box>
                <Text fontWeight='medium' translation='fiatRamps.availableProviders' />
                <Text
                  color='gray.500'
                  translation={[
                    'fiatRamps.titleMessage',
                    { action: fiatRampAction, asset: selectedAsset.symbol },
                  ]}
                />
              </Box>
            )}

            {providersLoading ? (
              <Center minHeight='150px'>
                <CircularProgress />
              </Center>
            ) : (
              <Stack>{renderProviders}</Stack>
            )}
          </Stack>
        )}
      </ModalBody>
    </>
  )
}
