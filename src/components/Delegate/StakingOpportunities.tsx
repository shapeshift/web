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
import { caip10, CAIP19 } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import { AprTag } from 'plugins/cosmos/components/AprTag/AprTag'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/Staking'
import { useMemo } from 'react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Column } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText, Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import {
  selectAllValidators,
  selectRewardsCryptoBalancesbyAccountSpecifier,
  selectStakingDatabyAccountSpecifier,
  selectStakingDataStatus,
  selectTotalBondingsBalancebyAccountSpecifier
} from 'state/slices/stakingDataSlice/selectors'
import { stakingDataApi } from 'state/slices/stakingDataSlice/stakingDataSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

const SHAPESHIFT_VALIDATOR_ADDRESS = 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'

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

export const StakingOpportunities = ({ assetId }: StakingOpportunitiesProps) => {
  const stakingDataStatus = useAppSelector(selectStakingDataStatus)
  const isLoaded = stakingDataStatus === 'loaded'
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const dispatch = useAppDispatch()
  const chainAdapterManager = useChainAdapters()
  const [chainAdapter, setChainAdapter] = useState<ChainAdapter<ChainTypes> | null>(null)
  const [address, setAddress] = useState<string>('')

  const validators = useAppSelector(selectAllValidators)
  console.log('validators', validators)

  const {
    state: { wallet }
  } = useWallet()

  const accountSpecifier = useMemo(() => {
    if (!address.length) return ''

    return caip10.toCAIP10({
      caip2: asset.caip2,
      account: address
    })
  }, [address, asset.caip2])

  console.log(accountSpecifier)

  useEffect(() => {
    ;(async () => {
      const cosmosChainAdapter = chainAdapterManager.byChain(asset.chain)
      setChainAdapter(cosmosChainAdapter)
    })()
  })

  useEffect(() => {
    ;(async () => {
      if (!chainAdapter || !wallet || !asset) return

      const address = await chainAdapter.getAddress({
        wallet
      })
      setAddress(address)
      console.log('address', address)
    })()
  }, [chainAdapter, wallet, asset])

  useEffect(() => {
    ;(async () => {
      if (!accountSpecifier.length || isLoaded) return

      dispatch(
        stakingDataApi.endpoints.getStakingData.initiate(
          { accountSpecifier },
          { forceRefetch: true }
        )
      )
    })()
  }, [accountSpecifier, isLoaded, dispatch])

  useEffect(() => {
    ;(async () => {
      if (isLoaded || validators.length) return

      dispatch(
        stakingDataApi.endpoints.getValidatorData.initiate(
          { chainId: 'cosmos:cosmoshub-4' },
          { forceRefetch: true }
        )
      )
    })()
  }, [isLoaded, dispatch])

  const stakingData = useAppSelector(state =>
    selectStakingDatabyAccountSpecifier(state, accountSpecifier)
  )

  // fetch validator data only if there is staking data
  if (stakingData != null) {
  }

  const totalBondingsByValidators = useAppSelector(state =>
    selectTotalBondingsBalancebyAccountSpecifier(
      state,
      accountSpecifier
    )
  )

  const rewardsAmountByValidators = useAppSelector(state =>
    selectRewardsCryptoBalancesbyAccountSpecifier(state, accountSpecifier)
  )

  console.log(totalBondingsByValidators, rewardsAmountByValidators)

  // TODO: wire up with real validator data
  const opportunities = [
    { id: 1, moniker: 'Cosmos Validator', apr: bn(0.12), rewards: { fiatRate: bn(0.08) } },
    {
      id: 2,
      moniker: 'Cosmos Validator',
      apr: bn(0.13),
      cryptoAmount: bn('1234'),
      rewards: {
        fiatRate: bn(0.08),
        stakedRewards: bn('12')
      }
    },
    {
      id: 3,
      moniker: 'Cosmos Validator',
      apr: bn(0.14),
      cryptoAmount: bn('789123'),
      rewards: {
        fiatRate: bn(0.08),
        stakedRewards: bn('345')
      }
    }
  ]
  const isStaking = opportunities.some(x => x.cryptoAmount)
  const assetSymbol = useAppSelector(state => selectAssetByCAIP19(state, assetId)).symbol

  const { cosmosGetStarted, cosmosStaking } = useModal()

  const handleGetStartedClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    cosmosGetStarted.open({ assetId: 'cosmos:cosmoshub-4/slip44:118' })
    e.stopPropagation()
  }

  const handleStakedClick = () => {
    cosmosStaking.open({ assetId: 'cosmos:cosmoshub-4/slip44:118', action: StakingAction.Overview })
  }

  const columns: Column<StakingOpportunity>[] = useMemo(
    () => [
      {
        Header: <Text translation='defi.validator' />,
        accessor: 'moniker',
        display: { base: 'table-cell' },
        Cell: ({ value }: { value: string }) => (
          <ValidatorName moniker={value} isStaking={isStaking}></ValidatorName>
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
