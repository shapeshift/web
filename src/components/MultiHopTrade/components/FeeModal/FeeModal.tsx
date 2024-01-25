import {
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { FeeExplainer } from 'components/FeeExplainer/FeeExplainer'

import { FeeBreakdown } from './FeeBreakdown'

export type FeeModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const FeeModal = ({ isOpen, onClose: handleClose }: FeeModalProps) => {
  const translate = useTranslate()

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size='lg'>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <Tabs variant='button'>
          <TabList px={6} py={4} borderBottomWidth={1} borderColor='border.base'>
            <Tab color='text.subtle'>{translate('foxDiscounts.feeSummary')}</Tab>
            <Tab color='text.subtle'>{translate('foxDiscounts.simulateFee')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel p={0}>
              <FeeBreakdown />
            </TabPanel>
            <TabPanel px={0} py={0}>
              <FeeExplainer borderRadius='none' bg='transparent' boxShadow='none' />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ModalContent>
    </Modal>
  )
}
