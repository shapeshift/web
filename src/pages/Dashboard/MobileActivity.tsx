import { Stack, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { TxsByStatus } from 'components/Layout/Header/TxWindow/TxWindow'

export const MobileActivity = memo(() => {
  const translate = useTranslate()
  return (
    <Stack>
      <Tabs variant='soft-rounded' isLazy size='sm'>
        <TabList m={0} gap={4} bg='transparent' borderWidth={0}>
          <Tab>{translate('transactionRow.pending')}</Tab>
          <Tab>{translate('transactionRow.confirmed')}</Tab>
          <Tab>{translate('transactionRow.failed')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <TxsByStatus txStatus={TxStatus.Pending} limit={'25'} />
          </TabPanel>
          <TabPanel px={0}>
            <TxsByStatus txStatus={TxStatus.Confirmed} limit={'25'} />
          </TabPanel>
          <TabPanel px={0}>
            <TxsByStatus txStatus={TxStatus.Failed} limit={'25'} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  )
})
