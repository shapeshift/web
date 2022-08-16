import { Center, Flex, ModalBody, ModalFooter, Skeleton, Stack, Tag } from '@chakra-ui/react'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { foxAssetId } from 'features/defi/providers/fox-eth-lp/constants'
import { matchPath } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useFoxFarmingBalances } from 'pages/Defi/hooks/useFoxFarmingBalances'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxFarmingEmpty } from './FoxFarmingEmpty'
import { WithdrawCard } from './WithdrawCard'

export const FoxFarmingDetails = () => {
  const { opportunities, loading } = useFoxFarmingBalances()
  const {
    query,
    history: browserHistory,
    location: browserLocation,
  } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const match = matchPath<DefiParams>(browserLocation.pathname, {
    path: '/defi/:earnType/:provider/:action',
    exact: true,
  })
  const { contractAddress } = query
  const opportunity = opportunities.find(e => e.contractAddress === contractAddress)
  const rewardBalance = bnOrZero(opportunity?.unclaimedRewards)
  const foxFarmingBalance = bnOrZero(opportunity?.cryptoAmount)
  const rewardAsset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const apy = opportunity?.apy?.toString()
  if (loading || !opportunity) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress isIndeterminate />
      </Center>
    )
  }
  if (foxFarmingBalance.eq(0) && rewardBalance.eq(0)) {
    return (
      <FoxFarmingEmpty
        assets={[{ icons: opportunity.icons! }, rewardAsset]}
        apy={apy ?? ''}
        opportunityName={opportunity.opportunityName || ''}
        onClick={() =>
          browserHistory.push({
            ...browserLocation,
            pathname: `/defi/${match?.params.earnType}/${match?.params.provider}/deposit/`,
          })
        }
      />
    )
  }
  return (
    <Flex
      width='full'
      minWidth={{ base: '100%', xl: '500px' }}
      maxWidth='fit-content'
      flexDir='column'
    >
      <ModalBody>
        <Stack alignItems='center' justifyContent='center' py={8}>
          <Text color='gray.500' translation='defi.modals.FoxFarmingOverview.FoxFarmingBalance' />
          <Stack direction='row' alignItems='center' justifyContent='center'>
            <AssetIcon boxSize='10' src={rewardAsset.icon} />
            <Amount.Crypto
              fontSize='3xl'
              fontWeight='medium'
              value={opportunity?.cryptoAmount}
              symbol={rewardAsset?.symbol}
            />
          </Stack>
          <Skeleton isLoaded={Boolean(apy)}>
            <Tag colorScheme='green'>
              <Amount.Percent value={apy ?? ''} suffix='APR' />
            </Tag>
          </Skeleton>
        </Stack>
      </ModalBody>
      <ModalFooter justifyContent='flex-start' alignItems='flex-start' flexDir='column'>
        <Stack width='full'>
          <Text fontWeight='medium' translation='defi.modals.FoxFarmingOverview.withdrawals' />
          <WithdrawCard asset={rewardAsset} amount={rewardBalance.toString()} />
        </Stack>
      </ModalFooter>
    </Flex>
  )
}
