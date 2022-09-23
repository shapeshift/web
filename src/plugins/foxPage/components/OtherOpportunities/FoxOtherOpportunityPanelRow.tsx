import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Flex } from '@chakra-ui/layout'
import { Button, Link, Skeleton, Text as CText, useColorModeValue } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useDefiOpportunity } from 'plugins/foxPage/hooks/useDefiOpportunity'
import qs from 'qs'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

import type { ExternalOpportunity } from '../../FoxCommon'

type FoxOtherOpportunityPanelRowProps = {
  opportunity: ExternalOpportunity
}

export const FoxOtherOpportunityPanelRow: React.FC<FoxOtherOpportunityPanelRowProps> = ({
  opportunity,
}) => {
  const translate = useTranslate()
  const hoverOpportunityBg = useColorModeValue('gray.100', 'gray.750')
  const { defiOpportunity } = useDefiOpportunity(opportunity)
  const hasActivePosition = bnOrZero(defiOpportunity?.fiatAmount).gt(0) ?? false
  const history = useHistory()
  const location = useLocation()
  const wrapperLinkProps = useMemo(
    () => (defiOpportunity ? {} : { as: Link, isExternal: true, href: opportunity.link }),
    [defiOpportunity, opportunity.link],
  )

  const handleClick = () => {
    if (defiOpportunity) {
      const { provider, chainId, contractAddress, assetId, rewardAddress } = defiOpportunity
      const { assetReference } = fromAssetId(assetId)
      history.push({
        pathname: location.pathname,
        search: qs.stringify({
          provider,
          chainId,
          contractAddress,
          assetReference,
          rewardId: rewardAddress,
          modal: 'overview',
        }),
        state: { background: location },
      })
    } else {
      window.open(opportunity.link)
    }
  }

  return (
    <Flex
      justifyContent='space-between'
      flexDirection='row'
      _hover={{ bg: hoverOpportunityBg, textDecoration: 'none' }}
      px={4}
      py={4}
      borderRadius={8}
      onClick={handleClick}
      cursor='pointer'
      {...wrapperLinkProps}
    >
      <Flex flexDirection='row' alignItems='center' width={{ base: 'auto', md: '40%' }}>
        {opportunity.icons.map((iconSrc, i) => (
          <AssetIcon
            key={iconSrc}
            src={iconSrc}
            boxSize={{ base: 6, md: 8 }}
            mr={i === opportunity.icons.length - 1 ? 2 : 0}
            ml={i === 0 ? 0 : '-3.5'}
          />
        ))}
        <CText color='inherit' fontWeight='semibold'>
          {opportunity.title}
        </CText>
      </Flex>
      <Skeleton
        isLoaded={opportunity.isLoaded ? true : false}
        textAlign={{ base: 'right', md: 'center' }}
      >
        <Box>
          <Text translation='plugins.foxPage.currentApy' color='gray.500' mb={1} />
          <Box
            color={opportunity.apy ? 'green.400' : undefined}
            fontSize={'xl'}
            fontWeight='semibold'
            lineHeight='1'
          >
            {opportunity.apy ? <Amount.Percent value={opportunity.apy} /> : '--'}
          </Box>
        </Box>
      </Skeleton>
      <Box alignSelf='center' display={{ base: 'none', md: 'block' }}>
        <Skeleton isLoaded={defiOpportunity?.isLoaded ?? true} textAlign='center'>
          {defiOpportunity ? (
            <Button colorScheme='blue' onClick={handleClick}>
              <Text
                translation={
                  hasActivePosition ? 'plugins.foxPage.manage' : 'plugins.foxPage.getStarted'
                }
              />
            </Button>
          ) : (
            <Button variant='link' colorScheme='blue' onClick={handleClick}>
              <CText mr={2}>{translate('plugins.foxPage.getStarted')}</CText>
              <ExternalLinkIcon />
            </Button>
          )}
        </Skeleton>
      </Box>
    </Flex>
  )
}
