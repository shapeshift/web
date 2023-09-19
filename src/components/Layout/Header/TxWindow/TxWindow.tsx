import type { TabProps } from '@chakra-ui/react'
import {
  Box,
  Circle,
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  IconButton,
  Select,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import React, { useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { TxHistoryIcon } from 'components/Icons/TxHistory'
import { RawText } from 'components/Text'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import { selectTxIdsByFilter } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const padding = { base: 4, md: 6 }

const CustomTab: React.FC<TabProps> = props => (
  <Tab
    px={0}
    fontWeight='medium'
    color='text.subtle'
    cursor='pointer'
    _selected={{ color: 'text.base' }}
    _hover={{ cursor: 'pointer' }}
    {...props}
  />
)
type TxsByStatusProps = {
  txStatus: TxStatus
  limit: string
}
const TxsByStatus: React.FC<TxsByStatusProps> = ({ txStatus, limit }) => {
  const translate = useTranslate()
  const filter = useMemo(() => ({ txStatus }), [txStatus])
  const txIds = useAppSelector(state => selectTxIdsByFilter(state, filter))
  const limitTxIds = useMemo(() => {
    return txIds.slice(0, Number(limit))
  }, [limit, txIds])

  if (limitTxIds.length === 0) {
    return (
      <RawText px={padding} color='text.subtle'>
        {translate('transactionRow.emptyMessage', { status: txStatus })}
      </RawText>
    )
  }
  return <TransactionsGroupByDate txIds={limitTxIds} useCompactMode />
}

export const TxWindow = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [limit, setLimit] = useState('25')
  const translate = useTranslate()
  const filter = useMemo(() => ({ txStatus: TxStatus.Pending }), [])
  const pendingTxIds = useAppSelector(state => selectTxIdsByFilter(state, filter))
  const hasPendingTxs = useMemo(() => pendingTxIds.length > 0, [pendingTxIds])
  return (
    <>
      <Box position='relative'>
        <IconButton
          aria-label='Pending Transactions'
          icon={hasPendingTxs ? <CircularProgress size='18px' /> : <TxHistoryIcon />}
          onClick={() => setIsOpen(!isOpen)}
        />
        <Circle
          position='absolute'
          size='18px'
          fontSize='12px'
          fontWeight='bold'
          bg='blue.500'
          color='white'
          top='-0.2em'
          right='-0.2em'
          opacity={hasPendingTxs ? 1 : 0}
          transitionProperty='common'
          transitionDuration='normal'
        >
          {pendingTxIds.length}
        </Circle>
      </Box>
      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} size='sm'>
        <DrawerOverlay backdropBlur='10px' />
        <DrawerContent
          minHeight='100vh'
          maxHeight='100vh'
          overflow='auto'
          paddingTop={`env(safe-area-inset-top)`}
        >
          <DrawerCloseButton top={'calc(var(--chakra-space-2) + env(safe-area-inset-top))'} />
          <DrawerHeader px={padding} display='flex' alignItems='center' gap={2}>
            <TxHistoryIcon color='text.subtle' />
            {translate('navBar.transactions')}
          </DrawerHeader>
          <Tabs variant='unstyled' isLazy>
            <Flex
              gap={4}
              justifyContent='space-between'
              px={padding}
              bg='background.surface.overlay.base'
              position='sticky'
              top={0}
              py={2}
              zIndex='banner'
            >
              <TabList gap={4}>
                <CustomTab>{translate('transactionRow.pending')}</CustomTab>
                <CustomTab>{translate('transactionRow.confirmed')}</CustomTab>
                <CustomTab>{translate('transactionRow.failed')}</CustomTab>
              </TabList>
              <Flex alignItems='center' gap={2}>
                <RawText fontSize='sm' color='text.subtle'>
                  {translate('common.show')}
                </RawText>
                <Select
                  size='sm'
                  variant='filled'
                  value={limit}
                  onChange={e => setLimit(e.target.value)}
                  borderRadius='lg'
                  fontWeight='medium'
                >
                  <option value='25'>25</option>
                  <option value='50'>50</option>
                  <option value='100'>100</option>
                </Select>
              </Flex>
            </Flex>
            <TabPanels>
              <TabPanel px={0}>
                <TxsByStatus txStatus={TxStatus.Pending} limit={limit} />
              </TabPanel>
              <TabPanel px={0}>
                <TxsByStatus txStatus={TxStatus.Confirmed} limit={limit} />
              </TabPanel>
              <TabPanel px={0}>
                <TxsByStatus txStatus={TxStatus.Failed} limit={limit} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </DrawerContent>
      </Drawer>
    </>
  )
}
