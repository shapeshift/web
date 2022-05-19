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
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'

type FoxTabProps = {
  assetIcon: string
  assetSymbol: string
  description: string
  buyCTA: string
  sellCTA: string
  onReceiveClick: () => void
  onBuyClick: () => void
}

export const AssetActions = ({
  assetIcon,
  assetSymbol,
  description,
  buyCTA,
  sellCTA,
  onReceiveClick,
  onBuyClick,
}: FoxTabProps) => {
  const translate = useTranslate()

  return (
    <Card display='block' borderRadius={8}>
      <Card.Body p={0}>
        <Tabs isFitted>
          <TabList>
            <Tab py={4} color='gray.500' fontWeight='semibold'>
              {translate('plugins.foxPage.getAsset', { assetSymbol })}
            </Tab>
            <Tab py={4} color='gray.500' fontWeight='semibold'>
              {translate('plugins.foxPage.trade')}
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel textAlign='center' p={6}>
              <Box mb={6}>
                <AssetIcon src={assetIcon} boxSize='16' />
              </Box>
              <SkeletonText isLoaded={true} noOfLines={3}>
                <Text translation={description} color='gray.500' mb={6} />
              </SkeletonText>

              <Stack width='full'>
                <Button onClick={onBuyClick} colorScheme={'blue'} mb={2} size='lg'>
                  <CText>{buyCTA}</CText>
                </Button>
                <Button onClick={onReceiveClick} size='lg' colorScheme='gray'>
                  <Text translation={sellCTA} />
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
