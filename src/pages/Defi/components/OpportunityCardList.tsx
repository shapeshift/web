import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Flex, Heading, SimpleGrid } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { FaPiggyBank } from 'react-icons/fa'
import { NavLink } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { selectAssetById } from '../../../state/slices/assetsSlice/selectors'
import { useAppSelector } from '../../../state/store'
import { UseEarnBalancesReturn } from '../hooks/useEarnBalances'
import { OpportunityCard } from './OpportunityCard'

export const iconReplaceMap = new Map<AssetId, string>()

const foxID = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
const foxyID = 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3'

export const overrideIconAssetId = (asset: Asset): string => {
  return iconReplaceMap.get(asset.assetId) || asset.icon
}

export const OpportunityCardList = ({ balances }: { balances: UseEarnBalancesReturn }) => {
  const activeOpportunities = balances.opportunities.filter(o => bnOrZero(o.cryptoAmount).gt(0))
  const foxyIcon = useAppSelector(state => selectAssetById(state, foxyID)).icon
  iconReplaceMap.set(foxID, foxyIcon)

  return (
    <Box mb={6}>
      <Flex alignItems='center' mb={6} justifyContent='space-between' px={{ base: 4, xl: 0 }}>
        <Flex alignItems='center' color='gray.500'>
          <IconCircle>
            <FaPiggyBank />
          </IconCircle>
          <Heading fontSize='lg' ml={3}>
            <Text translation='defi.earn' />
          </Heading>
        </Flex>
        <Button
          variant='ghost'
          colorScheme='blue'
          rightIcon={<ArrowForwardIcon />}
          as={NavLink}
          to='/defi/earn'
        >
          <Text translation='common.seeAll' />
        </Button>
      </Flex>
      <SimpleGrid
        gridTemplateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
        gridGap={6}
      >
        {activeOpportunities.map(opportunity => {
          return (
            <OpportunityCard
              key={opportunity.assetId}
              {...opportunity}
              overrideAssetIconID={overrideIconAssetId}
            />
          )
        })}
      </SimpleGrid>
      {activeOpportunities.length === 0 && (
        <Card textAlign='center' py={6} boxShadow='none'>
          <Card.Body>
            <Flex justifyContent='center' fontSize='xxx-large' mb={4} color='gray.500'>
              <IconCircle fontSize='2xl' boxSize='16'>
                <FaPiggyBank />
              </IconCircle>
            </Flex>
            <Text
              fontWeight='medium'
              fontSize='lg'
              mb={2}
              color='gray.500'
              translation='defi.earnBody'
            />
            <Button
              variant='ghost'
              colorScheme='blue'
              as={NavLink}
              to='/defi/earn'
              data-test='defi-view-opportunities-button'
            >
              <Text translation='defi.empty.stakingVaults.cta' />
            </Button>
          </Card.Body>
        </Card>
      )}
    </Box>
  )
}
