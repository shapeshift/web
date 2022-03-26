import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  HStack,
  Skeleton,
  SkeletonCircle,
  Tag,
  TagLabel
} from '@chakra-ui/react'
import { AprTag } from 'plugins/cosmos/components/AprTag/AprTag'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/Staking'
import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Column } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText, Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

type StakingOpportunity = {
  id: number
  validatorName: string
  apr: number
  stakedAmount?: string | undefined
  stakedRewards?: string | undefined
  fiatRewards?: number | undefined
}

type StakingOpportunitiesProps = {
  stakingOpportunities: StakingOpportunity[]
}

type ValidatorNameProps = {
  validatorName: string
}

export const ValidatorNameNotStacking = ({ validatorName }: ValidatorNameProps) => {
  const isLoaded = true

  return (
    <Box cursor='pointer'>
      <Flex alignItems='center' maxWidth='180px' mr={'-20px'}>
        <SkeletonCircle boxSize='8' isLoaded={isLoaded} mr={4}>
          <AssetIcon
            src={'https://assets.coingecko.com/coins/images/16724/small/osmo.png?1632763885'}
            boxSize='8'
          />
        </SkeletonCircle>
        <Skeleton isLoaded={isLoaded} cursor='pointer'>
          <RawText fontWeight='bold'>{`${validatorName}`}</RawText>
        </Skeleton>
      </Flex>
    </Box>
  )
}

export const ValidatorNameStacking = ({ validatorName }: ValidatorNameProps) => {
  const isLoaded = true

  return (
    <Box cursor='pointer'>
      <Flex alignItems='center' maxWidth='180px' mr={'-20px'}>
        <SkeletonCircle boxSize='8' isLoaded={isLoaded} mr={4}>
          <AssetIcon src={'https://assets.coincap.io/assets/icons/eth@2x.png'} boxSize='8' />
        </SkeletonCircle>
        <Skeleton isLoaded={isLoaded} cursor='pointer'>
          <Tag colorScheme='blue'>
            <TagLabel>{validatorName}</TagLabel>
          </Tag>
        </Skeleton>
      </Flex>
    </Box>
  )
}

export const StakingOpportunities = ({ stakingOpportunities }: StakingOpportunitiesProps) => {
  const isLoaded = true
  const assetSymbol = 'OSMO'
  const isStacking = stakingOpportunities.some(x => x.stakedAmount)

  const { cosmosGetStarted, cosmosStaking } = useModal()

  const handleGetStartedClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    cosmosGetStarted.open({ assetId: 'cosmoshub-4/slip44:118' })
    e.stopPropagation()
  }

  const handleStakedClick = () => {
    cosmosStaking.open({ assetId: 'cosmoshub-4/slip44:118', action: StakingAction.Overview })
  }

  const columns: Column<StakingOpportunity>[] = useMemo(
    () => [
      {
        Header: <Text translation='defi.validator' />,
        accessor: 'validatorName',
        display: { base: 'table-cell' },
        Cell: ({ value }: { value: string }) => {
          return isStacking ? (
            <ValidatorNameStacking validatorName={value}></ValidatorNameStacking>
          ) : (
            <ValidatorNameNotStacking validatorName={value}></ValidatorNameNotStacking>
          )
        },
        disableSortBy: true
      },
      {
        Header: <Text translation='defi.apr' />,
        accessor: 'apr',
        display: { base: 'table-cell' },
        Cell: ({ value }: { value: string }) => (
          <Skeleton isLoaded={isLoaded}>
            <AprTag percentage={value} showAprSuffix />
          </Skeleton>
        ),
        disableSortBy: true
      },
      {
        Header: <Text translation='defi.stakedAmount' />,
        accessor: 'stakedAmount',
        isNumeric: true,
        display: { base: 'table-cell' },
        Cell: ({ value }: { value: string }) => {
          return isStacking ? (
            <Amount.Crypto value={value} symbol={assetSymbol} color='white' fontWeight={'normal'} />
          ) : (
            <Box minWidth={{ base: '0px', md: '200px' }} />
          )
        },
        disableSortBy: true
      },
      {
        Header: <Text translation='defi.rewards' />,
        accessor: 'stakedRewards',
        display: { base: 'table-cell' },
        Cell: ({ value }: { value: string }) => {
          return isStacking ? (
            <HStack fontWeight={'normal'}>
              <Amount.Crypto value={value ?? ''} symbol={assetSymbol} />
              <Amount.Fiat value={value ?? ''} color='green.500' prefix='≈' />
            </HStack>
          ) : (
            <Button
              onClick={handleGetStartedClick}
              as='span'
              colorScheme='blue'
              variant='ghost-filled'
              size='sm'
              cursor='pointer'
            >
              <Text translation='common.getStarted' />
            </Button>
          )
        },
        disableSortBy: true
      }
    ],
    // React-tables requires the use of a useMemo
    // but we do not want it to recompute the values onClick
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  return (
    <Card>
      <Card.Header flexDir='row' display='flex'>
        <HStack justify='space-between' flex={1}>
          <Card.Heading>
            <Text translation='staking.staking' />
          </Card.Heading>

          <Button size='sm' variant='link' colorScheme='blue' as={NavLink} to='/defi/earn'>
            <Text translation='common.seeAll' /> <ArrowForwardIcon />
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body pt={0}>
        <ReactTable
          data={stakingOpportunities}
          columns={columns}
          displayHeaders={isStacking}
          onRowClick={handleStakedClick}
        />
      </Card.Body>
    </Card>
  )
}
