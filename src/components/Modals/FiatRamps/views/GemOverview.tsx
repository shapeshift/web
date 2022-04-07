import { CheckIcon, ChevronRightIcon, CopyIcon, ViewIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Text as RawText,
  useToast
} from '@chakra-ui/react'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { HDWallet, supportsBTC } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes } from '@shapeshiftoss/types'
import { History } from 'history'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useParams } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'

import { FiatRampActionButtons } from '../components/FiatRampActionButtons'
import { FiatRampAction, GemCurrency } from '../FiatRamps'
import { getAssetLogoUrl, makeGemPartnerUrl, middleEllipsis } from '../utils'

type GemOverviewProps = {
  history: History
  selectedAsset: GemCurrency | null
  isBTC: boolean
  btcAddress: string | null
  ethAddress: string | null
  ensName: string | null
  supportsAddressVerifying: boolean | null
  setSupportsAddressVerifying: (wallet: HDWallet) => boolean
  onFiatRampActionClick: (fiatRampAction: FiatRampAction) => void
  onIsSelectingAsset: (walletSupportsBTC: Boolean, selectAssetTranslation: string) => void
  setChainType: (chainType: ChainTypes) => void
  chainAdapter: ChainAdapter<ChainTypes.Bitcoin | ChainTypes.Ethereum>
}
export const GemOverview = ({
  history,
  onIsSelectingAsset,
  onFiatRampActionClick,
  supportsAddressVerifying,
  setSupportsAddressVerifying,
  btcAddress,
  ethAddress,
  ensName,
  selectedAsset,
  setChainType,
  chainAdapter,
  isBTC
}: GemOverviewProps) => {
  const translate = useTranslate()
  const { fiatRampAction } = useParams<{ fiatRampAction: FiatRampAction }>()
  const toast = useToast()
  const { fiatRamps } = useModal()

  const [shownOnDisplay, setShownOnDisplay] = useState<Boolean | null>(null)
  const {
    state: { wallet }
  } = useWallet()
  const addressOrNameFull = isBTC ? btcAddress : ensName || ethAddress
  const addressFull = isBTC ? btcAddress : ethAddress
  const addressOrNameEllipsed =
    isBTC && btcAddress
      ? middleEllipsis(btcAddress, 11)
      : ensName || middleEllipsis(ethAddress || '', 11)

  useEffect(() => {
    if (wallet && !supportsAddressVerifying) setSupportsAddressVerifying(wallet)
    const chainType =
      wallet && isBTC && supportsBTC(wallet) ? ChainTypes.Bitcoin : ChainTypes.Ethereum
    setChainType(chainType)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, isBTC])

  const [selectAssetTranslation, assetTranslation, fundsTranslation] = useMemo(
    () =>
      fiatRampAction === FiatRampAction.Buy
        ? ['fiatRamps.selectAnAssetToBuy', 'fiatRamps.assetToBuy', 'fiatRamps.fundsTo']
        : ['fiatRamps.selectAnAssetToSell', 'fiatRamps.assetToSell', 'fiatRamps.fundsFrom'],
    [fiatRampAction]
  )

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
    const deviceAddress = await chainAdapter.getAddress({
      wallet,
      showOnDevice: true
    })
    const shownOnDisplay =
      Boolean(deviceAddress) && (deviceAddress === ethAddress || deviceAddress === btcAddress)
    setShownOnDisplay(shownOnDisplay)
  }

  return (
    <SlideTransition>
      <Flex direction='column'>
        <FiatRampActionButtons action={fiatRampAction} setAction={onFiatRampActionClick} />
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
          onClick={() =>
            onIsSelectingAsset(Boolean(wallet && supportsBTC(wallet)), selectAssetTranslation)
          }
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
        <Button
          width='full'
          size='lg'
          colorScheme='blue'
          disabled={!selectedAsset}
          as='a'
          mt='25px'
          href={makeGemPartnerUrl(fiatRampAction, selectedAsset?.ticker || '', addressFull || '')}
          target='_blank'
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
