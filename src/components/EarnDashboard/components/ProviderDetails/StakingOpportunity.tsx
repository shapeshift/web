import { Button, Flex, List, ListItem, SimpleGrid, Tag } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { Amount } from 'components/Amount/Amount'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText } from 'components/Text'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import type { UnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import { getRewardBalances } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectMarketDataSortedByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type RewardRowProps = {
  assetId: AssetId
  balances: UnderlyingAssetIdsBalances
  isClaimableRewards: boolean
}

const RewardRow: React.FC<RewardRowProps> = ({ assetId, balances, isClaimableRewards }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) return null
  return (
    <ListItem
      display='grid'
      pl='3rem'
      position='relative'
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 'calc(2rem - 1px)',
        display: 'block',
        width: 0,
        borderLeftWidth: 2,
        borderColor: 'gray.700',
      }}
      _last={{
        ':before': {
          height: '1.5rem',
          bottom: 'auto',
        },
        '.reward-asset:after': {
          borderBottomLeftRadius: '8px',
        },
      }}
    >
      <Button
        variant='ghost'
        height='auto'
        py={4}
        display='grid'
        gridTemplateColumns='1fr repeat(3, 170px)'
        columnGap={4}
        alignItems='center'
        textAlign='left'
      >
        <AssetCell
          className='reward-asset'
          assetId={assetId}
          subText={isClaimableRewards ? 'Reward • Claimable' : 'Reward • Accrued'}
          position='relative'
          _after={{
            content: '""',
            position: 'absolute',
            left: 'calc(-1 * 2rem - 1px)',
            display: 'block',
            height: '50%',
            marginTop: '-1em',
            width: '1em',
            borderBottomWidth: 2,
            borderLeftWidth: 2,
            borderColor: 'gray.700',
          }}
        />

        <Flex>
          {isClaimableRewards && (
            <Tag colorScheme='green' size='sm'>
              Claimable
            </Tag>
          )}
        </Flex>

        <Amount.Crypto
          value={balances.cryptoBalancePrecision}
          symbol={asset.symbol}
          fontSize='sm'
          fontWeight='medium'
          color='green.200'
          display={{ base: 'none', md: 'block ' }}
          whiteSpace='break-spaces'
        />
        <Amount.Fiat
          color='green.200'
          fontSize='sm'
          fontWeight='medium'
          value={balances.fiatAmount}
        />
      </Button>
    </ListItem>
  )
}

export const StakingOppority: React.FC<StakingEarnOpportunityType> = props => {
  const {
    underlyingAssetId,
    fiatAmount,
    stakedAmountCryptoBaseUnit,
    version,
    opportunityName,
    type,
    rewardAssetIds,
    rewardsCryptoBaseUnit,
    isClaimableRewards,
  } = props
  const asset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectMarketDataSortedByMarketCap)
  const rewardBalances = getRewardBalances({
    rewardAssetIds,
    rewardsCryptoBaseUnit,
    assets,
    marketData,
  })
  if (!asset) return null
  return (
    <Flex flexDir='column' gap={4}>
      <SimpleGrid
        gridTemplateColumns='1fr repeat(2, 170px)'
        color='gray.500'
        textTransform='uppercase'
        fontSize='xs'
        letterSpacing='0.02em'
        fontWeight='bold'
        borderBottomWidth={1}
        borderColor='gray.750'
        columnGap={4}
        pb={2}
        px={4}
      >
        <RawText>
          {version ?? opportunityName} {type}
        </RawText>
        <RawText>Balance</RawText>
        <RawText>Value</RawText>
      </SimpleGrid>
      <List ml={0} mt={0} spacing={4}>
        <Button
          variant='ghost'
          py={4}
          width='full'
          height='auto'
          display='grid'
          gridTemplateColumns='1fr repeat(2, 170px)'
          columnGap={4}
          alignItems='center'
          textAlign='left'
        >
          <AssetCell assetId={underlyingAssetId} subText='Deposit' justifyContent='flex-start' />
          <Amount.Crypto
            value={bnOrZero(stakedAmountCryptoBaseUnit)
              .div(bn(10).pow(asset.precision))
              .decimalPlaces(asset.precision)
              .toString()}
            symbol={asset.symbol}
            fontSize='sm'
            fontWeight='medium'
            whiteSpace='break-spaces'
            color='chakra-body-text'
            display={{ base: 'none', md: 'block ' }}
          />
          <Amount.Fiat
            color='chakra-body-text'
            fontSize='sm'
            fontWeight='medium'
            value={fiatAmount}
          />
        </Button>
        {rewardAssetIds && (
          <List style={{ marginTop: 0 }}>
            {rewardAssetIds.map(rewardAssetId => {
              if (!rewardBalances[rewardAssetId]) return null
              return (
                <RewardRow
                  isClaimableRewards={isClaimableRewards}
                  assetId={rewardAssetId}
                  balances={rewardBalances[rewardAssetId]}
                />
              )
            })}
          </List>
        )}
      </List>
    </Flex>
  )
}
