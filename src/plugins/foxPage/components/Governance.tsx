import { Badge, Box, Flex } from '@chakra-ui/layout'
import { Link, Progress, Skeleton, Text as CText, useColorModeValue } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'

import { BOARDROOM_APP_BASE_URL, useGetGovernanceData } from '../hooks/getGovernanceData'

export const Governance = () => {
  const translate = useTranslate()
  const linkColor = useColorModeValue('blue.500', 'blue.200')
  const governanceData = useGetGovernanceData()

  return (
    <Skeleton isLoaded={governanceData.loaded}>
      <Card display='block' width='full'>
        <Card.Header>
          <Flex flexDirection='row' justifyContent='space-between' alignItems='center' mb={2}>
            <CText fontWeight='bold' color='inherit'>
              {translate('plugins.foxPage.governanceTitle')}
            </CText>
            <Link
              isExternal
              href={`${BOARDROOM_APP_BASE_URL}/proposals`}
              fontWeight='semibold'
              color={linkColor}
            >
              <Text translation='plugins.foxPage.seeAllProposals' />
            </Link>
          </Flex>
          <Text
            translation='Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut eget elit faucibus'
            color='gray.500'
          />
        </Card.Header>
        {governanceData?.data.map((proposal, i) => (
          <Card.Body key={i}>
            <Box>
              <Link
                isExternal
                href={`${BOARDROOM_APP_BASE_URL}/proposal/${proposal.refId}`}
                fontWeight='semibold'
                color={linkColor}
                mb={4}
                display='inline-block'
              >
                <CText>{proposal.title}</CText>
              </Link>
              {proposal.choices.map((choice, i) => (
                <Box mb={4} key={i}>
                  <Flex justifyContent='space-between' mb={2}>
                    <CText fontWeight='semibold'>{choice}</CText>

                    <Flex>
                      <CText fontWeight='semibold' mr={2}>
                        {proposal.results[i].absolute}
                      </CText>
                      <Badge
                        colorScheme='blue'
                        display='flex'
                        alignItems='center'
                        px={2}
                        py={'2px'}
                        borderRadius='md'
                      >
                        <Amount.Percent value={proposal.results[i].percent} fontWeight='normal' />
                      </Badge>
                    </Flex>
                  </Flex>
                  <Progress value={66.98} height={1} colorScheme='green' />
                </Box>
              ))}
            </Box>
          </Card.Body>
        ))}
      </Card>
    </Skeleton>
  )
}
