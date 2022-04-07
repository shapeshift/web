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
import { CAIP19 } from '@shapeshiftoss/caip'
import { AprTag } from 'plugins/cosmos/components/AprTag/AprTag'
import { MouseEvent } from 'react'
import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Column } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText, Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakingOpportunity = {
  id: number
  moniker: string
  apr: BigNumber
  cryptoAmount?: BigNumber
  rewards: Rewards
}

type Rewards = {
  fiatRate: BigNumber
  stakedRewards?: BigNumber
}

type StakingOpportunitiesProps = {
  assetId: CAIP19
  opportunities: StakingOpportunity[]
}

type ValidatorNameProps = {
  moniker: string
  isStaking: boolean
}

export const ValidatorName = ({ moniker, isStaking }: ValidatorNameProps) => {
  const isLoaded = true
  const assetIcon = isStaking
    ? 'https://assets.coincap.io/assets/icons/eth@2x.png'
    : 'https://assets.coingecko.com/coins/images/16724/small/osmo.png?1632763885'

  return (
    <Box cursor='pointer'>
      <Flex alignItems='center' maxWidth='180px' mr={'-20px'}>
        <SkeletonCircle boxSize='8' isLoaded={isLoaded} mr={4}>
          <AssetIcon src={assetIcon} boxSize='8' />
        </SkeletonCircle>
        <Skeleton isLoaded={isLoaded} cursor='pointer'>
          {isStaking && (
            <Tag colorScheme='blue'>
              <TagLabel>{moniker}</TagLabel>
            </Tag>
          )}
          {!isStaking && <RawText fontWeight='bold'>{`${moniker}`}</RawText>}
        </Skeleton>
      </Flex>
    </Box>
  )
}

export const StakingOpportunities = ({ assetId, opportunities }: StakingOpportunitiesProps) => {
  const isLoaded = true
  const isStaking = opportunities.some(x => x.cryptoAmount)
  const assetSymbol = useAppSelector(state => selectAssetByCAIP19(state, assetId)).symbol

  const { cosmosGetStarted, cosmosStaking } = useModal()

  const handleGetStartedClick = (e: MouseEvent<HTMLButtonElement>) => {
    cosmosGetStarted.open({ assetId: 'cosmos:cosmoshub-4/slip44:118' })
    e.stopPropagation()
  }

  const handleStakedClick = () => {
    cosmosStaking.open({ assetId: 'cosmos:cosmoshub-4/slip44:118' })
  }

  const columns: Column<StakingOpportunity>[] = useMemo(
    () => [
      {
        Header: <Text translation='defi.validator' />,
        accessor: 'moniker',
        display: { base: 'table-cell' },
        Cell: ({ value }: { value: string }) => (
          <ValidatorName moniker={value} isStaking={isStaking} />
        ),
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
        accessor: 'cryptoAmount',
        isNumeric: true,
        display: { base: 'table-cell' },
        Cell: ({ value }: { value: BigNumber }) => {
          return isStaking ? (
            <Amount.Crypto
              value={bnOrZero(value).toString()}
              symbol={assetSymbol}
              color='white'
              fontWeight={'normal'}
            />
          ) : (
            <Box minWidth={{ base: '0px', md: '200px' }} />
          )
        },
        disableSortBy: true
      },
      {
        Header: <Text translation='defi.rewards' />,
        accessor: 'rewards',
        display: { base: 'table-cell' },
        Cell: ({ value }: { value: Rewards }) => {
          return isStaking ? (
            <HStack fontWeight={'normal'}>
              <Amount.Crypto
                value={bnOrZero(value.stakedRewards).toString()}
                symbol={assetSymbol}
              />
              <Amount.Fiat
                value={bnOrZero(value.stakedRewards).times(value.fiatRate).toPrecision()}
                color='green.500'
                prefix='≈'
              />
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
          data={opportunities}
          columns={columns}
          displayHeaders={isStaking}
          onRowClick={handleStakedClick}
        />
      </Card.Body>
    </Card>
  )
}
