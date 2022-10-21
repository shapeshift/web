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
  ModalBody,
  Spinner,
  Stack,
  Text as RawText,
  useToast,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCreditCard } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useParams } from 'react-router'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useGetFiatRampsQuery } from 'state/apis/fiatRamps/fiatRamps'
import {
  selectAssets,
  selectPortfolioAccountMetadataByAccountId,
  selectPortfolioFiatBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { FiatRampActionButtons } from '../components/FiatRampActionButtons'
import { FiatRampButton } from '../components/FiatRampButton'
import { supportedFiatRamps } from '../config'
import { FiatRampAction } from '../FiatRampsCommon'
import { middleEllipsis } from '../utils'

type OverviewProps = {
  accountId: Nullable<AccountId>
  address: string
  vanityAddress: string
  assetId?: AssetId
  onFiatRampActionClick: (fiatRampAction: FiatRampAction) => void
  onIsSelectingAsset: (assetId: AssetId | undefined, selectAssetTranslation: string) => void
  handleAccountIdChange: (accountId: AccountId) => void
}

export const Overview: React.FC<OverviewProps> = ({
  onIsSelectingAsset,
  onFiatRampActionClick,
  assetId,
  handleAccountIdChange,
  accountId,
  address,
  vanityAddress,
}) => {
  const assetsById = useSelector(selectAssets)
  const translate = useTranslate()
  const { fiatRampAction } = useParams<{ fiatRampAction: FiatRampAction }>()
  const toast = useToast()
  const {
    state: { wallet },
  } = useWallet()
  const [shownOnDisplay, setShownOnDisplay] = useState<Boolean | null>(null)
  useEffect(() => setShownOnDisplay(null), [accountId])

  const filter = useMemo(
    () => ({ assetId: assetId ?? '', accountId: accountId ?? '' }),
    [assetId, accountId],
  )
  const accountMetadata = useAppSelector(s => selectPortfolioAccountMetadataByAccountId(s, filter))
  const accountFiatBalance = useAppSelector(s => selectPortfolioFiatBalanceByFilter(s, filter))
  const { data: ramps, isLoading: isRampsLoading } = useGetFiatRampsQuery()

  const [selectAssetTranslation, assetTranslation, fundsTranslation] = useMemo(
    () =>
      fiatRampAction === FiatRampAction.Buy
        ? ['fiatRamps.selectAnAssetToBuy', 'fiatRamps.asset', 'fiatRamps.fundsTo']
        : ['fiatRamps.selectAnAssetToSell', 'fiatRamps.asset', 'fiatRamps.fundsFrom'],
    [fiatRampAction],
  )

  const handleCopyClick = useCallback(async () => {
    const duration = 2500
    const isClosable = true
    const toastPayload = { duration, isClosable }
    try {
      await navigator.clipboard.writeText(vanityAddress || address)
      const title = translate('common.copied')
      const status = 'success'
      const description = vanityAddress ?? address
      toast({ description, title, status, ...toastPayload })
    } catch (e) {
      const title = translate('common.copyFailed')
      const status = 'error'
      const description = translate('common.copyFailedDescription')
      toast({ description, title, status })
    }
  }, [address, vanityAddress, toast, translate])

  const supportsAddressVerification = useMemo(() => wallet instanceof KeepKeyHDWallet, [wallet])

  const handleVerify = useCallback(async () => {
    if (!accountId) return
    if (!wallet) return
    if (!address) return
    if (!accountMetadata) return
    const { accountType, bip44Params } = accountMetadata
    const showOnDevice = true
    const payload = { accountType, bip44Params, wallet, showOnDevice }
    const verifiedAddress = await getChainAdapterManager()
      .get(fromAccountId(accountId).chainId)!
      .getAddress(payload)
    const shownOnDisplay = verifiedAddress === address
    setShownOnDisplay(shownOnDisplay)
  }, [accountId, accountMetadata, address, wallet])

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
          <Text translation='fiatRamps.noProvidersBody' color='gray.500' />
        </Center>
      )
    return rampIdsForAssetIdAndAction.map(rampId => {
      const ramp = supportedFiatRamps[rampId]
      return (
        <FiatRampButton
          key={rampId}
          onClick={() => ramp.onSubmit(fiatRampAction, assetId, address)}
          accountFiatBalance={accountFiatBalance}
          action={fiatRampAction}
          {...ramp}
        />
      )
    })
  }, [accountFiatBalance, address, assetId, fiatRampAction, isRampsLoading, ramps])

  const inputValue = useMemo(() => {
    if (vanityAddress) return vanityAddress
    return address ? middleEllipsis(address, 11) : ''
  }, [address, vanityAddress])

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
            onClick={() => onIsSelectingAsset(assetId, selectAssetTranslation)}
            rightIcon={<ChevronRightIcon color='gray.500' boxSize={6} />}
          >
            {assetId ? (
              <Flex alignItems='center'>
                <AssetIcon size='sm' assetId={assetId} mr={4} />
                <Box textAlign='left'>
                  <RawText lineHeight={1}>{assetsById[assetId].name}</RawText>
                </Box>
              </Flex>
            ) : (
              <Text translation={selectAssetTranslation} color='gray.500' />
            )}
          </Button>
          {assetId && (
            <Flex flexDirection='column' mb='10px'>
              <Text translation={fundsTranslation} color='gray.500' mt='15px' mb='8px' />
              <AccountDropdown
                autoSelectHighestBalance={true}
                assetId={assetId}
                onChange={handleAccountIdChange}
                buttonProps={{ variant: 'solid', width: 'full' }}
                boxProps={{ px: 0 }}
              />
              <InputGroup size='md'>
                <Input
                  pr='4.5rem'
                  value={inputValue}
                  readOnly
                  placeholder={translate('common.loadingText')}
                />
                {!address && <InputLeftElement children={<Spinner size='sm' />} />}
                {address && (
                  <InputRightElement width={supportsAddressVerification ? '4.5rem' : undefined}>
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
                            : 'gray.500'
                        }
                        isRound
                        variant='ghost'
                      />
                    )}
                  </InputRightElement>
                )}
              </InputGroup>
            </Flex>
          )}
        </Stack>
        {assetId && address && (
          <Stack spacing={4}>
            {ramps && (
              <Box>
                <Text fontWeight='medium' translation='fiatRamps.availableProviders' />
                <Text
                  color='gray.500'
                  translation={[
                    'fiatRamps.titleMessage',
                    { action: fiatRampAction, asset: assetsById[assetId].symbol },
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
        )}
      </ModalBody>
    </>
  )
}
