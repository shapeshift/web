import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Card,
  CardBody,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { Text } from 'components/Text'

export const Faq = () => {
  const defaultIndex = useMemo(() => [0], [])
  return (
    <Card>
      <CardBody px={8} py={8} display='flex' flexDir='column' gap={6}>
        <Text fontWeight='bold' fontSize='xl' translation='RFOX.faq.title' />
        <Accordion variant='default' defaultIndex={defaultIndex}>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='RFOX.faq.what.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='RFOX.faq.what.body' />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='RFOX.faq.why.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='RFOX.faq.why.body' />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='RFOX.faq.stake.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='RFOX.faq.stake.body' />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='RFOX.faq.unstake.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='RFOX.faq.unstake.body' />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='RFOX.faq.cooldown.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='RFOX.faq.cooldown.body' />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='RFOX.faq.multipleUnstaking.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='RFOX.faq.multipleUnstaking.body' />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem px={0}>
            <AccordionButton textAlign='left' px={0}>
              <Text fontWeight='bold' translation='RFOX.faq.connect.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='RFOX.faq.connect.body' />
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </CardBody>
    </Card>
  )
}
