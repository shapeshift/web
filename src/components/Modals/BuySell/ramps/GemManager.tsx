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
import { getConfig } from 'config'
import queryString from 'querystring'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'

import { BuySellAction, CurrencyAsset } from '../BuySell'
import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import { getAssetLogoUrl } from '../components/AssetSearch/helpers/getAssetLogoUrl'
import { BuySellActionButtons } from '../components/BuySellActionButtons'

const middleEllipsis = (address: string, cut: number) =>
  `${address.slice(0, cut)}...${address.slice(-1 * cut)}`

const GEM_ENV = getConfig().REACT_APP_GEM_ENV
const GEM_API_KEY = getConfig().REACT_APP_GEM_API_KEY
const GEM_URL = getConfig().REACT_APP_GEM_URL

export const GemManager = () => {
  const translate = useTranslate()
  const toast = useToast()
  const { buysell } = useModal()

  const [asset, setAsset] = useState<CurrencyAsset | null>()
  const [isSelectingAsset, setIsSelectingAsset] = useState(false)
  const [verified, setVerified] = useState<boolean | null>(null)

  const onSelectAsset = (data: CurrencyAsset) => {
    setIsSelectingAsset(false)
    setAsset(data)
  }
  const [action, setAction] = useState<BuySellAction>(BuySellAction.Buy)
  const { state } = useWallet()
  const address = state?.walletInfo?.meta?.address
  const wallet = state?.wallet

  useEffect(() => setAsset(null), [action])

  const [selectAssetTranslation, assetTranslation, fundsTranslation] = useMemo(
    () =>
      action === BuySellAction.Buy
        ? ['buysell.selectAnAssetToBuy', 'buysell.assetToBuy', 'buysell.fundsTo']
        : ['buysell.selectAnAssetToSell', 'buysell.assetToSell', 'buysell.fundsFrom'],
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

  const handleVerify = async () => {
    setVerified(true)
  }

  return (
    <SlideTransition>
      <Box minWidth='370px' maxWidth='500px' m={4}>
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
            <AssetSearch onClick={onSelectAsset} type={action} />
          </Stack>
        ) : (
          <Stack spacing={4} mt={2}>
            <BuySellActionButtons action={action} setAction={setAction} />
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
                  <Input pr='4.5rem' value={middleEllipsis(address as string, 11)} readOnly />
                  <InputRightElement width='4.5rem'>
                    <IconButton
                      icon={<CopyIcon />}
                      aria-label='copy-icon'
                      size='sm'
                      isRound
                      variant='ghost'
                      onClick={copyHandler}
                    />
                    {!(wallet?.getVendor() === 'Native') ? (
                      <IconButton
                        icon={verified ? <CheckIcon /> : <ViewIcon />}
                        onClick={handleVerify}
                        aria-label='check-icon'
                        size='sm'
                        color={verified ? 'green.500' : verified === false ? 'red.500' : 'gray.500'}
                        isRound
                        variant='ghost'
                      />
                    ) : undefined}
                  </InputRightElement>
                </InputGroup>
              </Flex>
            )}
            <Button
              width='full'
              colorScheme='blue'
              disabled={!asset}
              as='a'
              href={gemUrl}
              target='_blank'
            >
              <Text translation='common.continue' />
            </Button>
            <Button width='full' variant='ghost' onClick={buysell.close}>
              <Text translation='common.cancel' />
            </Button>
          </Stack>
        )}
      </Box>
    </SlideTransition>
  )
}
