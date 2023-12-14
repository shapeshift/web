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
import type { ShapeShiftFee } from 'lib/fees/utils'

import { FeeBreakdown } from './FeeBreakdown'

export type FeeModalProps = {
  isOpen: boolean
  onClose: () => void
  shapeShiftFee: ShapeShiftFee | undefined
}

export const FeeModal = ({ isOpen, onClose: handleClose, shapeShiftFee }: FeeModalProps) => {
  const translate = useTranslate()

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size='lg'>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <Tabs variant='button'>
          <TabList px={6} py={4} borderBottomWidth={1} borderColor='border.base'>
            <Tab>{translate('foxDiscounts.feeSummary')}</Tab>
            <Tab>{translate('foxDiscounts.simulateFee')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel p={0}>
              <FeeBreakdown
                feeBps={shapeShiftFee?.affiliateBps ?? '0'}
                feeUserCurrency={shapeShiftFee?.amountAfterDiscountUserCurrency ?? '0'}
                foxDiscountPercent={shapeShiftFee?.foxDiscountPercent ?? '0'}
                feeBeforeDiscountUserCurrency={
                  shapeShiftFee?.amountBeforeDiscountUserCurrency ?? '0'
                }
                feeDiscountUserCurrency={shapeShiftFee?.feeDiscountUserCurrency ?? '0'}
                feeBpsBeforeDiscount={shapeShiftFee?.potentialAffiliateBps ?? '0'}
              />
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
