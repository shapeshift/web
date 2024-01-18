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
        <Text fontWeight='bold' fontSize='xl' translation='pools.faq.title' />
        <Accordion variant='default' defaultIndex={defaultIndex}>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='pools.faq.what.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='pools.faq.what.body' />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='pools.faq.how.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='pools.faq.how.body' />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='pools.faq.amm.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='pools.faq.amm.body' />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='pools.faq.rewards.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='pools.faq.rewards.body' />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem px={0}>
            <AccordionButton px={0}>
              <Text fontWeight='bold' translation='pools.faq.risks.title' />
            </AccordionButton>
            <AccordionPanel px={0}>
              <Text color='text.subtle' translation='pools.faq.risks.body' />
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </CardBody>
    </Card>
  )
}
