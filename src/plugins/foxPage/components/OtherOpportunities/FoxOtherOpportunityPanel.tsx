import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Badge, Box, Flex } from '@chakra-ui/layout'
import {
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Button,
  Link,
  Skeleton,
  Text as CText,
  useColorModeValue,
} from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text/Text'

import { ExternalOpportunity, OpportunityTypes } from '../../FoxCommon'

type FoxOtherOpportunityPanelProps = {
  opportunities: ExternalOpportunity[]
  title: string
  type: OpportunityTypes
}

export const FoxOtherOpportunityPanel: React.FC<FoxOtherOpportunityPanelProps> = ({
  opportunities,
  title,
}) => {
  const translate = useTranslate()
  const borderColor = useColorModeValue('gray.150', 'gray.700')
  const hoverOpportunityBg = useColorModeValue('gray.100', 'gray.750')

  return (
    <AccordionItem borderColor={borderColor} _last={{ borderBottomWidth: 0 }}>
      <AccordionButton px={6} py={4}>
        <Box flex='1' textAlign='left' fontWeight='semibold'>
          {translate(title)}
        </Box>
        <Flex>
          <Badge
            colorScheme='blue'
            display='flex'
            alignItems='center'
            px={2}
            py={'2px'}
            borderRadius='md'
            mr={4}
          >
            {opportunities.length}
          </Badge>
          <AccordionIcon color='gray.500' />
        </Flex>
      </AccordionButton>
      <AccordionPanel pb={8} pt={5} px={2} my={-4}>
        {opportunities?.map(opportunity => (
          <Flex
            key={opportunity.link}
            as={Link}
            justifyContent='space-between'
            flexDirection={'row'}
            _hover={{ bg: hoverOpportunityBg, textDecoration: 'none' }}
            href={opportunity.link}
            isExternal
            px={{ base: 2, md: 4 }}
            py={4}
            borderRadius={8}
          >
            <Flex flexDirection='row' alignItems='center' width={{ base: 'auto', md: '40%' }}>
              {opportunity.icons.map((iconSrc, i) => (
                <AssetIcon
                  key={iconSrc}
                  src={iconSrc}
                  boxSize='8'
                  mr={i === opportunity.icons.length - 1 ? 2 : 0}
                  ml={i === 0 ? 0 : '-3.5'}
                />
              ))}
              <CText color='inherit' fontWeight='semibold'>
                {opportunity.title}
              </CText>
            </Flex>
            <Skeleton isLoaded={opportunity.isLoaded ? true : false} textAlign='center'>
              <Box>
                <Text translation='plugins.foxPage.currentApy' color='gray.500' mb={1} />
                <CText
                  color={opportunity.apy ? 'green.400' : undefined}
                  fontSize={'xl'}
                  fontWeight='semibold'
                  lineHeight='1'
                >
                  {opportunity.apy ? <Amount.Percent value={opportunity.apy} /> : '--'}
                </CText>
              </Box>
            </Skeleton>
            <Box alignSelf='center' display={{ base: 'none', sm: 'block' }}>
              <Button variant='link' colorScheme='blue'>
                <CText mr={2}>{translate('plugins.foxPage.getStarted')}</CText>
                <ExternalLinkIcon />
              </Button>
            </Box>
          </Flex>
        ))}
      </AccordionPanel>
    </AccordionItem>
  )
}
