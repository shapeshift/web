import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { Trade } from 'components/Trade/Trade'

export const CardActions = () => {
  return (
    <Card flex={1}>
      <Tabs isFitted variant='soft-rounded' defaultIndex={2}>
        <TabList>
          <Tab>
            <Text translation='assets.assetCards.assetActions.buy' />
          </Tab>
          <Tab>
            <Text translation='assets.assetCards.assetActions.sell' />
          </Tab>
          <Tab>
            <Text translation='assets.assetCards.assetActions.trade' />
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <p>one!</p>
          </TabPanel>
          <TabPanel>
            <p>two!</p>
          </TabPanel>
          <TabPanel>
            <Trade />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  )
}
