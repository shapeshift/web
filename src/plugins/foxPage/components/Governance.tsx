import { Badge, Box, Flex } from '@chakra-ui/layout'
import { Link, Progress, Text as CText, useColorModeValue } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'

export const Governance = () => {
  const translate = useTranslate()
  const linkColor = useColorModeValue('blue.500', 'blue.200')

  return (
    <Card display='block' width='full'>
      <Card.Header>
        <Flex flexDirection='row' justifyContent='space-between' alignItems='center' mb={2}>
          <CText fontWeight='bold' color='inherit'>
            {translate('plugins.foxPage.governanceTitle')}
          </CText>
          <Link isExternal href={'#'} fontWeight='semibold' color={linkColor}>
            <Text translation='plugins.foxPage.seeAllProposals' />
          </Link>
        </Flex>
        <Text
          translation='Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut eget elit faucibus'
          color='gray.500'
        />
      </Card.Header>
      <Card.Body>
        <Box>
          <Link
            isExternal
            href={'#'}
            fontWeight='semibold'
            color={linkColor}
            mb={4}
            display='inline-block'
          >
            <Text translation='[SCP-71] Proposal to Create the KeepKey Workstream' />
          </Link>
          <Box mb={4}>
            <Flex justifyContent='space-between' mb={2}>
              <Text translation='plugins.foxPage.for' fontWeight='semibold' />

              <Flex>
                <Text translation='2,934,283' fontWeight='semibold' mr={2} />
                <Badge
                  colorScheme='blue'
                  display='flex'
                  alignItems='center'
                  px={2}
                  py={'2px'}
                  borderRadius='md'
                >
                  <Amount.Percent value={'0.6698'} fontWeight='normal' />
                </Badge>
              </Flex>
            </Flex>
            <Progress value={66.98} height={1} colorScheme='green' />
          </Box>

          <Box mb={4}>
            <Flex justifyContent='space-between' mb={2}>
              <Text translation='plugins.foxPage.against' fontWeight='semibold' />

              <Flex>
                <Text translation='1,446,828' fontWeight='semibold' mr={2} />
                <Badge
                  colorScheme='blue'
                  display='flex'
                  alignItems='center'
                  px={2}
                  py={'2px'}
                  borderRadius='md'
                >
                  <Amount.Percent value={'0.3302'} fontWeight='normal' />
                </Badge>
              </Flex>
            </Flex>
            <Progress value={33.02} height={1} colorScheme='green' />
          </Box>
        </Box>
      </Card.Body>
    </Card>
  )
}
