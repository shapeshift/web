import { ArrowBackIcon, CheckIcon, ChevronRightIcon, CopyIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Text as RawText
} from '@chakra-ui/react'
import { getConfig } from 'config'
import { AssetSearch } from 'features/buysell/components/AssetSearch/AssetSearch'
import { getAssetLogoUrl } from 'features/buysell/components/AssetSearch/helpers/getAssetLogoUrl/getAssetLogoUrl'
import { BuySellActionButtons } from 'features/buysell/components/BuySellActionButtons'
import {
  BuySellAsset,
  BuySellParams
} from 'features/buysell/contexts/BuySellManagerProvider/BuySellManagerProvider'
import queryString from 'querystring'
import { useEffect, useMemo, useState } from 'react'
import { useRouteMatch } from 'react-router'
import { useHistory } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useWallet } from 'context/WalletProvider/WalletProvider'

const middleEllipsis = (address: string, cut: number) =>
  `${address.slice(0, cut)}...${address.slice(-1 * cut)}`

const GEM_ENV = getConfig().REACT_APP_GEM_ENV
const GEM_API_KEY = getConfig().REACT_APP_GEM_API_KEY
const GEM_URL = getConfig().REACT_APP_GEM_URL

export const GemManager = () => {
  const [asset, setAsset] = useState<BuySellAsset | null>()
  const [isSelectingAsset, setIsSelectingAsset] = useState(false)

  const history = useHistory()
  const onSelectAsset = (data: BuySellAsset) => {
    setIsSelectingAsset(false)
    setAsset(data)
  }
  const match = useRouteMatch<BuySellParams>()
  const action = match?.params?.action
  const { state } = useWallet()
  const address = state?.walletInfo?.meta?.address

  useEffect(() => setAsset(null), [action])

  const [selectAssetTranslation, assetTranslation, fundsTranslation] = useMemo(
    () =>
      action === 'buy'
        ? ['buysell.selectAnAssestToBuy', 'buysell.assetToBuy', 'buysell.fundsTo']
        : ['buysell.selectAnAssestToSell', 'buysell.assetToSell', 'buysell.fundsFrom'],
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

  const onSubmit = () => {
    window.open(gemUrl, '_blank')
  }

  return (
    <SlideTransition>
      <Box spacing={2} minWidth='370px' maxWidth='500px' m={4}>
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
            <BuySellActionButtons />
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
                      onClick={() => {
                        navigator.clipboard.writeText(address as string)
                      }}
                    />
                    <IconButton
                      icon={<CheckIcon />}
                      aria-label='check-icon'
                      size='sm'
                      color='green.500'
                      isRound
                      variant='ghost'
                    />
                  </InputRightElement>
                </InputGroup>
              </Flex>
            )}
            <Button width='full' colorScheme='blue' disabled={!asset} onClick={onSubmit}>
              <Text translation='common.continue' />
            </Button>
            <Button width='full' variant='ghost' onClick={history.goBack}>
              <Text translation='common.cancel' />
            </Button>
          </Stack>
        )}
      </Box>
    </SlideTransition>
  )
}
