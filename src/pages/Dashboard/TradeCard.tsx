import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { Bridge } from 'components/Bridge/Bridge'
import { Card } from 'components/Card/Card'
import { Trade } from 'components/Trade/Trade'

type TradeCardProps = {
  defaultBuyAssetId?: AssetId
}

export const TradeCard = ({ defaultBuyAssetId }: TradeCardProps) => {
  return (
    <Card flex={1} variant='outline'>
      <Tabs isFitted variant='enclosed'>
        <TabList>
          <Tab>Trade</Tab>
          <Tab>Bridge</Tab>
        </TabList>
        <TabPanels>
          <TabPanel py={4} px={6}>
            <Trade defaultBuyAssetId={defaultBuyAssetId} />
          </TabPanel>
          <TabPanel py={4} px={6}>
            <Bridge />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  )
}
