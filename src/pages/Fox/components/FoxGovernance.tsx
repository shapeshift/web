import type { FlexProps } from '@chakra-ui/react'
import {
  Box,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  Link,
  Skeleton,
  Text as CText,
} from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { useFoxPageContext } from '../hooks/useFoxPageContext'

const containerPaddingX = { base: 4, xl: 0 }
const headerTitleMb = { base: 4, md: 0 }
const headerTitleMaxWidth = { base: '100%', md: '50%' }
const headerSx: FlexProps['sx'] = {
  alignItems: { base: 'flex-start', md: 'center' },
  justifyContent: 'space-between',
  mb: 8,
  flexDir: {
    base: 'column',
    md: 'row',
  },
}

export const FoxGovernance = () => {
  const { assetAccountId } = useFoxPageContext()
  const translate = useTranslate()
  const isFoxGovernanceEnabled = useFeatureFlag('FoxPageGovernance')

  if (!isFoxGovernanceEnabled) return null

  return (
    <>
      <Divider mb={4} />
      <Box py={4} px={containerPaddingX}>
        <Flex sx={headerSx}>
          <Box mb={headerTitleMb} maxWidth={headerTitleMaxWidth}>
            <Heading as='h2' fontSize='2xl' display='flex' alignItems='center'>
              <CText as='span' me={2}>
                🏛️
              </CText>
              {translate('foxPage.governance.title')}
            </Heading>
            <Flex alignItems='center'>
              <Text
                fontSize='md'
                color='text.subtle'
                translation='foxPage.governance.description.0'
              />
              <Link
                colorScheme='blue'
                color='blue.300'
                href='https://governance.shapeshift.com/'
                isExternal
                mx={1}
              >
                {translate('foxPage.governance.description.1')}
              </Link>
              <Text
                fontSize='md'
                color='text.subtle'
                translation='foxPage.governance.description.2'
              />
            </Flex>
          </Box>

          <Card width='100%' maxWidth='400px'>
            <CardBody py={4} px={4}>
              <Flex alignItems='center' justifyContent='space-between'>
                <Box width='100%'>
                  <Text
                    fontSize='md'
                    color='text.subtle'
                    translation='foxPage.governance.totalVotingPower'
                  />

                  <Skeleton isLoaded={false}>
                    <Amount.Crypto value={'100'} symbol={'FOX'} />
                  </Skeleton>
                </Box>
              </Flex>
            </CardBody>
          </Card>
        </Flex>
      </Box>
    </>
  )
}
