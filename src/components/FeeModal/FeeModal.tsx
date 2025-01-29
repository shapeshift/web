import {
  Modal,
  ModalBody,
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
import type { ParameterModel } from 'lib/fees/parameters/types'

import { FeeBreakdown } from './FeeBreakdown'

export type FeeModalProps = {
  inputAmountUsd: string | undefined
  isOpen: boolean
  onClose: () => void
  feeModel: ParameterModel
}

export const FeeModal = ({
  inputAmountUsd,
  isOpen,
  onClose: handleClose,
  feeModel,
}: FeeModalProps) => {
  const translate = useTranslate()

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size='lg'>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton zIndex='1' />
        <ModalBody p={0}>
          <Tabs variant='button'>
            <TabList px={6} py={4} borderBottomWidth={1} borderColor='border.base'>
              <Tab color='text.subtle'>{translate('foxDiscounts.feeSummary')}</Tab>
              <Tab color='text.subtle'>{translate('foxDiscounts.simulateFee')}</Tab>
            </TabList>
            <TabPanels>
              <TabPanel p={0}>
                <FeeBreakdown feeModel={feeModel} inputAmountUsd={inputAmountUsd} />
              </TabPanel>
              <TabPanel px={0} py={0}>
                <FeeExplainer
                  inputAmountUsd={inputAmountUsd}
                  borderRadius='none'
                  bg='transparent'
                  boxShadow='none'
                  feeModel={feeModel}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
