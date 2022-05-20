import { Box, Stack } from '@chakra-ui/layout'
import {
  Button,
  SkeletonText,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text as CText,
} from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type FoxTabProps = {
  assetId: AssetId
  onReceiveClick: () => void
  onBuyClick: () => void
}

export const AssetActions = ({ assetId, onReceiveClick, onBuyClick }: FoxTabProps) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  //const { name, description, isTrustedDescription } = asset || {}
  const query = useGetAssetDescriptionQuery(assetId)
  const isLoaded = !query.isLoading
  return (
    <Card display='block' borderRadius={8}>
      <Card.Body p={0}>
        <Tabs isFitted>
          <TabList>
            <Tab py={4} color='gray.500' fontWeight='semibold'>
              {translate('plugins.foxPage.getAsset', {
                assetSymbol: asset.symbol,
              })}
            </Tab>
            <Tab py={4} color='gray.500' fontWeight='semibold'>
              {translate('plugins.foxPage.trade')}
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel textAlign='center' p={6}>
              <Box mb={6}>
                <AssetIcon src={asset.icon} boxSize='16' />
              </Box>
              <SkeletonText isLoaded={isLoaded} noOfLines={3}>
                <Text translation={'TODO desc ....'} color='gray.500' mb={6} />
              </SkeletonText>

              <Stack width='full'>
                <Button onClick={onBuyClick} colorScheme={'blue'} mb={2} size='lg'>
                  <CText>
                    {translate('plugins.foxPage.buyAssetOnCoinbase', {
                      assetSymbol: asset.symbol,
                    })}
                  </CText>
                </Button>
                <Button onClick={onReceiveClick} size='lg' colorScheme='gray'>
                  <Text translation={'plugins.foxPage.receive'} />
                </Button>
              </Stack>
            </TabPanel>
            <TabPanel p={6}></TabPanel>
          </TabPanels>
        </Tabs>
      </Card.Body>
    </Card>
  )
}
