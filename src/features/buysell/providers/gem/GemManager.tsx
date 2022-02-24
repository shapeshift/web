import { ArrowBackIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, IconButton, Stack, Text as RawText } from '@chakra-ui/react'
import { AssetSearch } from 'features/buysell/components/AssetSearch/AssetSearch'
import { BuySellActionButtons } from 'features/buysell/components/BuySellActionButtons'
import {
  BuySellAsset,
  BuySellParams
} from 'features/buysell/contexts/BuySellManagerProvider/BuySellManagerProvider'
import { useMemo, useState } from 'react'
import { useRouteMatch } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

export const GemManager = () => {
  const [asset, setAsset] = useState<BuySellAsset>()
  const [isSelectingAsset, setIsSelectingAsset] = useState(false)

  const onSelectAsset = (data: BuySellAsset) => {
    setIsSelectingAsset(false)
    setAsset(data)
  }
  const match = useRouteMatch<BuySellParams>()
  const action = match?.params?.action

  const selectAssetTranslation = useMemo(
    () =>
      action === 'buy' ? 'buysell.page.selectAnAssestToBuy' : 'buysell.page.selectAnAssestToSell',
    [action]
  )

  const assetTranslation = useMemo(
    () => (action === 'buy' ? 'buysell.page.assetToBuy' : 'buysell.page.assetToSell'),
    [action]
  )
  return (
    <SlideTransition>
      <Box spacing={2} minWidth='300px' maxWidth='500px' m={4}>
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
                <>
                  <AssetIcon src={asset?.source} mr={4} />
                  <Box textAlign='left'>
                    <RawText lineHeight={1}>{asset.name}</RawText>
                    <RawText fontWeight='normal' fontSize='sm' color='gray.500'>
                      {asset.ticker}
                    </RawText>
                  </Box>
                </>
              ) : (
                <Text translation={selectAssetTranslation} color='gray.500' />
              )}
            </Button>
            <Button width='full' colorScheme='blue'>
              <Text translation='common.continue' />
            </Button>
            <Button width='full' variant='ghost'>
              <Text translation='common.cancel' />
            </Button>
          </Stack>
        )}
      </Box>
    </SlideTransition>
  )
}
