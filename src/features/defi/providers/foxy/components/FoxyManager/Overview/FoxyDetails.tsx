import { Center, Flex, ModalBody, ModalFooter, Skeleton, Stack, Tag } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useMemo } from 'react'
import { matchPath } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import { selectAssetById, selectBIP44ParamsByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { FoxyEmpty } from './FoxyEmpty'
import { WithdrawCard } from './WithdrawCard'

type FoxyDetailsProps = {
  accountId: Nullable<AccountId>
}

export const FoxyDetails: React.FC<FoxyDetailsProps> = ({ accountId }) => {
  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const { data: foxyBalancesData, isLoading: isFoxyBalancesLoading } = useFoxyBalances({
    accountNumber: bip44Params?.accountNumber,
  })
  const {
    query,
    history: browserHistory,
    location: browserLocation,
  } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const match = matchPath<DefiParams>(browserLocation.pathname, {
    path: '/defi/:earnType/:provider/:action',
    exact: true,
  })
  const { chainId, contractAddress, assetReference, rewardId } = query
  const opportunity = (foxyBalancesData?.opportunities || []).find(
    e => e.contractAddress === contractAddress,
  )
  const rewardBalance = bnOrZero(opportunity?.withdrawInfo.amount)
  const foxyBalance = bnOrZero(opportunity?.balance)
  const assetNamespace = 'erc20'
  const stakingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const rewardAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: rewardId,
  })
  const rewardAsset = useAppSelector(state => selectAssetById(state, rewardAssetId))
  const apy = opportunity?.apy
  if (isFoxyBalancesLoading || !opportunity) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress isIndeterminate />
      </Center>
    )
  }
  if (foxyBalance.eq(0) && rewardBalance.eq(0)) {
    return (
      <FoxyEmpty
        assets={[stakingAsset, rewardAsset]}
        apy={apy ?? ''}
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
          <Text color='gray.500' translation='defi.modals.foxyOverview.foxyBalance' />
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
          <Text fontWeight='medium' translation='defi.modals.foxyOverview.withdrawals' />
          <WithdrawCard asset={stakingAsset} {...opportunity.withdrawInfo} />
        </Stack>
      </ModalFooter>
    </Flex>
  )
}
