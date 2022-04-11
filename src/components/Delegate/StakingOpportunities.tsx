import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  HStack,
  Skeleton,
  SkeletonCircle,
  Tag,
  TagLabel,
} from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { AprTag } from 'plugins/cosmos/components/AprTag/AprTag'
import { MouseEvent, useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText, Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAccountSpecifier,
  selectAssetByCAIP19,
  selectMarketDataById,
} from 'state/slices/selectors'
import {
  ActiveStakingOpportunity,
  selectActiveStakingOpportunityDataByAssetId,
  selectNonloadedValidators,
  selectSingleValidator,
  selectStakingDataIsLoaded,
  selectValidatorIsLoaded,
} from 'state/slices/stakingDataSlice/selectors'
import { stakingDataApi } from 'state/slices/stakingDataSlice/stakingDataSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

const SHAPESHIFT_VALIDATOR_ADDRESS = 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'

type StakingOpportunitiesProps = {
  assetId: CAIP19
}

type ValidatorNameProps = {
  moniker: string
  isStaking: boolean
  validatorAddress: string
}

export const ValidatorName = ({ moniker, isStaking, validatorAddress }: ValidatorNameProps) => {
  const isLoaded = true
  const assetIcon = isStaking
    ? `https://raw.githubusercontent.com/cosmostation/cosmostation_token_resource/master/moniker/cosmoshub/${validatorAddress}.png`
    : 'https://assets.coincap.io/assets/icons/256/atom.png'

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
  const isStakingDataLoaded = useAppSelector(selectStakingDataIsLoaded)
  const isValidatorDataLoaded = useAppSelector(selectValidatorIsLoaded)
  const isLoaded = isStakingDataLoaded && isValidatorDataLoaded
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const dispatch = useAppDispatch()

  const accountSpecifiers = useAppSelector(state => selectAccountSpecifier(state, asset?.caip2))
  const accountSpecifier = accountSpecifiers?.[0]

  const activeStakingOpportunities = useAppSelector(state =>
    selectActiveStakingOpportunityDataByAssetId(
      state,
      accountSpecifier,
      SHAPESHIFT_VALIDATOR_ADDRESS,
      asset.caip19,
    ),
  )

  const shapeshiftValidator = useAppSelector(state =>
    selectSingleValidator(state, accountSpecifier, SHAPESHIFT_VALIDATOR_ADDRESS),
  )
  const stakingOpportunities = [
    {
      ...shapeshiftValidator,
    },
  ]
  const nonLoadedValidators = useAppSelector(state =>
    selectNonloadedValidators(state, accountSpecifier),
  )
  const hasActiveStakingOpportunities = activeStakingOpportunities.length !== 0
  const chainId = asset.caip2

  useEffect(() => {
    ;(async () => {
      if (!accountSpecifier?.length || isStakingDataLoaded) return

      dispatch(
        stakingDataApi.endpoints.getStakingData.initiate(
          { accountSpecifier },
          { forceRefetch: true },
        ),
      )
    })()
  }, [accountSpecifier, isStakingDataLoaded, dispatch])

  useEffect(() => {
    ;(async () => {
      if (isValidatorDataLoaded) return

      dispatch(
        stakingDataApi.endpoints.getAllValidatorsData.initiate({ chainId }, { forceRefetch: true }),
      )
    })()
  }, [isValidatorDataLoaded, dispatch, chainId])

  useEffect(() => {
    ;(async () => {
      if (!isValidatorDataLoaded || !nonLoadedValidators?.length) return

      nonLoadedValidators.forEach(validatorAddress => {
        dispatch(
          stakingDataApi.endpoints.getValidatorData.initiate(
            { chainId, validatorAddress },
            { forceRefetch: true },
          ),
        )
      })
    })()
  }, [isValidatorDataLoaded, nonLoadedValidators, dispatch, chainId])

  const { cosmosGetStarted, cosmosStaking } = useModal()

  const handleGetStartedClick = (e: MouseEvent<HTMLButtonElement>) => {
    cosmosGetStarted.open({ assetId })
    e.stopPropagation()
  }

  const handleStakedClick = (values: Row<ActiveStakingOpportunity>) => {
    cosmosStaking.open({
      assetId,
      validatorAddress: values.original.address,
    })
  }

  const columns: Column<ActiveStakingOpportunity>[] = useMemo(
    () => [
      {
        Header: <Text translation='defi.validator' />,
        id: 'moniker',
        display: { base: 'table-cell' },
        Cell: ({ row }: { row: { original: ActiveStakingOpportunity } }) => (
          <ValidatorName
            validatorAddress={row.original.address}
            moniker={row.original.moniker}
            isStaking={hasActiveStakingOpportunities}
          />
        ),
        disableSortBy: true,
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
        disableSortBy: true,
      },
      {
        Header: <Text translation='defi.stakedAmount' />,
        accessor: 'cryptoAmount',
        isNumeric: true,
        display: { base: 'table-cell' },
        Cell: ({ value }: { value: string }) => {
          return hasActiveStakingOpportunities ? (
            <Amount.Crypto
              value={bnOrZero(value)
                .div(`1e+${asset.precision}`)
                .decimalPlaces(asset.precision)
                .toString()}
              symbol={asset.symbol}
              color='white'
              fontWeight={'normal'}
            />
          ) : (
            <Box minWidth={{ base: '0px', md: '200px' }} />
          )
        },
        disableSortBy: true,
      },
      {
        Header: <Text translation='defi.rewards' />,
        accessor: 'rewards',
        display: { base: 'table-cell' },
        Cell: ({ value }: { value: string }) => {
          return hasActiveStakingOpportunities ? (
            <HStack fontWeight={'normal'}>
              <Amount.Crypto
                value={bnOrZero(value)
                  .div(`1e+${asset.precision}`)
                  .decimalPlaces(asset.precision)
                  .toString()}
                symbol={asset.symbol}
              />
              <Amount.Fiat
                value={bnOrZero(value)
                  .div(`1e+${asset.precision}`)
                  .times(bnOrZero(marketData.price))
                  .toPrecision()}
                color='green.500'
                prefix='≈'
              />
            </HStack>
          ) : (
            <Box width='100%' textAlign={'right'}>
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
            </Box>
          )
        },
        disableSortBy: true,
      },
    ],
    // React-tables requires the use of a useMemo
    // but we do not want it to recompute the values onClick
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoaded],
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
      <Card.Body pt={0} px={2}>
        <ReactTable
          data={
            !hasActiveStakingOpportunities && isLoaded
              ? stakingOpportunities
              : activeStakingOpportunities
          }
          columns={columns}
          displayHeaders={hasActiveStakingOpportunities}
          onRowClick={handleStakedClick}
        />
      </Card.Body>
    </Card>
  )
}
