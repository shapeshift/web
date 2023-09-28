import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Card,
  CardBody,
} from '@chakra-ui/react'
import { Text } from 'components/Text'

export const Faq = () => {
  return (
    <Card>
      <CardBody px={8} py={8} display='flex' flexDir='column' gap={6}>
        <Text fontSize='xl' translation='lending.faq.title' />
        <Accordion variant='default' defaultIndex={[0]}>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='lending.faq.lending.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='lending.faq.lending.body' />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='lending.faq.borrowing.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='lending.faq.borrowing.body' />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='lending.faq.repayments.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='lending.faq.repayments.body' />
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </CardBody>
    </Card>
  )
}
