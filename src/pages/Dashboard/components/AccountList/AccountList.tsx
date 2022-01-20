import { Flex, Grid, Stack } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import range from 'lodash/range'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { AccountRow } from 'components/AccountRow/AccountRow'
import { LoadingRow } from 'components/AccountRow/LoadingRow'
import { Card } from 'components/Card/Card'
import { IconCircle } from 'components/IconCircle'
import { DashboardIcon } from 'components/Icons/Dashboard'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import {
  selectPortfolioAllocationPercent,
  selectPortfolioAssetBalancesSortedFiat,
  selectPortfolioIsEmpty,
  selectPortfolioLoading
} from 'state/slices/portfolioSlice/selectors'

const AccountHeader = () => (
  <Grid
    templateColumns={{
      base: '1fr repeat(1, 1fr)',
      md: '1fr repeat(2, 1fr)',
      lg: '2fr repeat(3, 1fr) 150px'
    }}
    gap='1rem'
    py={4}
    pl={4}
    pr={4}
  >
    <Text translation='dashboard.portfolio.asset' color='gray.500' />
    <Text
      translation='dashboard.portfolio.balance'
      display={{ base: 'none', md: 'block' }}
      color='gray.500'
      textAlign='right'
    />
    <Text
      translation='dashboard.portfolio.price'
      color='gray.500'
      textAlign='right'
      display={{ base: 'none', lg: 'block' }}
    />
    <Text translation='dashboard.portfolio.value' textAlign='right' color='gray.500' />
    <Text
      translation='dashboard.portfolio.allocation'
      color='gray.500'
      textAlign='right'
      display={{ base: 'none', lg: 'block' }}
    />
  </Grid>
)

const EmptyPortfolio = () => {
  const { receive } = useModal()

  return (
    <Card textAlign='center' py={6} boxShadow='none' borderWidth={0}>
      <Card.Body>
        <Flex justifyContent='center' fontSize='xxx-large' mb={4} color='gray.500'>
          <IconCircle fontSize='2xl' boxSize='16'>
            <DashboardIcon />
          </IconCircle>
        </Flex>
        <Text
          fontWeight='medium'
          fontSize='lg'
          mb={2}
          color='gray.500'
          translation='dashboard.portfolio.empty.title'
        />
        <Button variant='ghost' colorScheme='blue' onClick={() => receive.open({})}>
          <Text translation='dashboard.portfolio.empty.cta' />
        </Button>
      </Card.Body>
    </Card>
  )
}

export const AccountList = () => {
  const sortedBalances = useSelector(selectPortfolioAssetBalancesSortedFiat)
  const portfolioAllocationPercent = useSelector(selectPortfolioAllocationPercent)
  const loading = useSelector(selectPortfolioLoading)
  const isPortfolioEmpty = useSelector(selectPortfolioIsEmpty)

  const accountRows = useMemo(() => {
    if (isPortfolioEmpty) return EmptyPortfolio

    return (
      <>
        <AccountHeader />
        {Object.entries(sortedBalances)
          // TODO(0xdef1cafe): add a toggle to show balances
          // .filter(([assetId]) => bnOrZero(sortedBalances[assetId]).gt(0))
          .map(([assetId]) => (
            <AccountRow
              allocationValue={portfolioAllocationPercent[assetId]}
              assetId={assetId}
              key={assetId}
              data-test='dashboard-account-row'
            />
          ))}
      </>
    )
  }, [portfolioAllocationPercent, sortedBalances, isPortfolioEmpty])

  const loadingRows = useMemo(() => {
    return (
      <Stack>
        {range(5).map(index => (
          <LoadingRow key={index} />
        ))}
      </Stack>
    )
  }, [])

  return <Stack>{loading ? loadingRows : accountRows}</Stack>
}
