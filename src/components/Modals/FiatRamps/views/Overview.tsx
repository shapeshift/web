import { CheckIcon, ChevronRightIcon, CopyIcon, ViewIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Text as RawText,
  useToast,
} from '@chakra-ui/react'
import { btcChainId, cosmosChainId, ethChainId } from '@shapeshiftoss/caip'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useParams } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assetIdToChainId, ChainIdType } from 'state/slices/portfolioSlice/utils'

import { FiatRampActionButtons } from '../components/FiatRampActionButtons'
import { FiatRamp, supportedFiatRamps } from '../config'
import { FiatRampAction, FiatRampAsset } from '../FiatRampsCommon'
import { middleEllipsis } from '../utils'

type OverviewProps = {
  selectedAsset: FiatRampAsset | null
  fiatRampProvider: FiatRamp
  btcAddress: string
  ethAddress: string
  cosmosAddress: string
  ensName: string
  supportsAddressVerifying: boolean
  setSupportsAddressVerifying: Dispatch<SetStateAction<boolean>>
  onFiatRampActionClick: (fiatRampAction: FiatRampAction) => void
  onIsSelectingAsset: (asset: FiatRampAsset | null, selectAssetTranslation: string) => void
  chainId: ChainIdType
  setChainId: Dispatch<SetStateAction<ChainIdType>>
  chainAdapterManager: ChainAdapterManager
}
type GenerateAddressProps = {
  selectedAsset: FiatRampAsset | null
  btcAddress: string
  ethAddress: string
  cosmosAddress: string
  ensName: string
}
type AddressOrNameFull = string
type AddressFull = string
type AddressOrNameEllipsed = string
type GenerateAddressesReturn = [AddressOrNameFull, AddressFull, AddressOrNameEllipsed]
type GenerateAddresses = (props: GenerateAddressProps) => GenerateAddressesReturn

const generateAddresses: GenerateAddresses = props => {
  const { selectedAsset, btcAddress, ethAddress, ensName, cosmosAddress } = props
  const assetId = selectedAsset?.assetId
  const empty: GenerateAddressesReturn = ['', '', '']
  if (!assetId) return empty
  const chainId = assetIdToChainId(assetId)
  switch (chainId) {
    case ethChainId:
      return [ensName || ethAddress, ethAddress, ensName || middleEllipsis(ethAddress, 11)]
    case btcChainId:
      return [btcAddress, btcAddress, middleEllipsis(btcAddress, 11)]
    case cosmosChainId:
      return [cosmosAddress, cosmosAddress, middleEllipsis(cosmosAddress, 11)]
    default:
      return empty
  }
}

export const Overview: React.FC<OverviewProps> = ({
  fiatRampProvider,
  onIsSelectingAsset,
  onFiatRampActionClick,
  supportsAddressVerifying,
  setSupportsAddressVerifying,
  btcAddress,
  ethAddress,
  cosmosAddress,
  ensName,
  selectedAsset,
  chainId,
  setChainId,
  chainAdapterManager,
}) => {
  const translate = useTranslate()
  const { fiatRampAction } = useParams<{ fiatRampAction: FiatRampAction }>()
  const toast = useToast()
  const { fiatRamps } = useModal()

  const [shownOnDisplay, setShownOnDisplay] = useState<Boolean | null>(null)

  const {
    state: { wallet },
  } = useWallet()

  const [addressOrNameFull, addressFull, addressOrNameEllipsed] = generateAddresses({
    selectedAsset,
    btcAddress,
    ethAddress,
    cosmosAddress,
    ensName,
  })

  useEffect(() => {
    if (!wallet) return
    supportsAddressVerifying && setSupportsAddressVerifying(true)
    setChainId(assetIdToChainId(selectedAsset?.assetId ?? '') ?? ethChainId)
    // supportsAddressVerifying will cause infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsset, setChainId, setSupportsAddressVerifying, wallet])

  const [selectAssetTranslation, assetTranslation, fundsTranslation] = useMemo(
    () =>
      fiatRampAction === FiatRampAction.Buy
        ? ['fiatRamps.selectAnAssetToBuy', 'fiatRamps.assetToBuy', 'fiatRamps.fundsTo']
        : ['fiatRamps.selectAnAssetToSell', 'fiatRamps.assetToSell', 'fiatRamps.fundsFrom'],
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

  const handleVerify = async () => {
    const chainAdapter = await chainAdapterManager.get(chainId)
    if (!(wallet && chainAdapter)) return
    const deviceAddress = await chainAdapter.getAddress({
      wallet,
      showOnDevice: true,
    })
    const shownOnDisplay =
      Boolean(deviceAddress) && (deviceAddress === ethAddress || deviceAddress === btcAddress)
    setShownOnDisplay(shownOnDisplay)
  }

  return (
    <SlideTransition>
      <Flex direction='column'>
        <FiatRampActionButtons
          action={fiatRampAction}
          setAction={onFiatRampActionClick}
          supportsBuy={supportedFiatRamps[fiatRampProvider].supportsBuy}
          supportsSell={supportedFiatRamps[fiatRampProvider].supportsSell}
        />
        <Text
          translation={assetTranslation}
          color='gray.500'
          fontWeight='semibold'
          mt='15px'
          mb='8px'
        />
        <Button
          width='full'
          colorScheme='gray'
          justifyContent='space-between'
          height='70px'
          onClick={() => onIsSelectingAsset(selectedAsset, selectAssetTranslation)}
          rightIcon={<ChevronRightIcon color='gray.500' boxSize={6} />}
        >
          {selectedAsset ? (
            <Flex alignItems='center'>
              <AssetIcon
                src={selectedAsset.imageUrl}
                symbol={selectedAsset.symbol.toLowerCase()}
                mr={4}
              />
              <Box textAlign='left'>
                <RawText lineHeight={1}>{selectedAsset.name}</RawText>
                <RawText fontWeight='normal' fontSize='sm' color='gray.500'>
                  {selectedAsset?.symbol}
                </RawText>
              </Box>
            </Flex>
          ) : (
            <Text translation={selectAssetTranslation} color='gray.500' />
          )}
        </Button>
        {selectedAsset && (
          <Flex flexDirection='column' mb='10px'>
            <Text translation={fundsTranslation} color='gray.500' mt='15px' mb='8px'></Text>
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
        {selectedAsset?.isBelowSellThreshold && (
          <Alert status='error' variant={'solid'}>
            <AlertIcon />
            <Text
              translation={[
                'fiatRamps.insufficientCryptoAmountToSell',
                { amount: supportedFiatRamps[fiatRampProvider].minimumSellThreshold },
              ]}
            />
          </Alert>
        )}
        <Button
          width='full'
          size='lg'
          colorScheme='blue'
          disabled={!selectedAsset || selectedAsset?.isBelowSellThreshold}
          mt='25px'
          onClick={() =>
            supportedFiatRamps[fiatRampProvider].onSubmit(
              fiatRampAction,
              selectedAsset?.assetId || '',
              addressFull || '',
            )
          }
        >
          <Text translation='common.continue' />
        </Button>
        <Button width='full' size='lg' variant='ghost' onClick={fiatRamps.close}>
          <Text translation='common.cancel' />
        </Button>
      </Flex>
    </SlideTransition>
  )
}
