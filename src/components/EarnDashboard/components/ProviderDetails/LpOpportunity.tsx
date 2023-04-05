import { Button, Flex, List, ListItem, SimpleGrid, Tag } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText } from 'components/Text'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { LpEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import type { UnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import { getUnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectMarketDataById,
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
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const translate = useTranslate()
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
          subText={translate('defi.modals.overview.underlyingToken')}
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
          color='chakra-body-text'
          fontWeight='medium'
          display={{ base: 'none', md: 'block ' }}
          whiteSpace='break-spaces'
        />
        <Flex flexDir='column'>
          <Amount.Fiat
            color='chakra-body-text'
            fontSize='sm'
            fontWeight='medium'
            value={balances.fiatAmount}
          />
          <Amount.Percent
            fontSize='xs'
            value={bnOrZero(marketData.changePercent24Hr).div(100).toString()}
            autoColor
          />
        </Flex>
      </Button>
    </ListItem>
  )
}

export const LpOpportunity: React.FC<LpEarnOpportunityType> = props => {
  const {
    assetId,
    underlyingAssetId,
    fiatAmount,
    version,
    opportunityName,
    type,
    rewardAssetIds,
    isClaimableRewards,
    underlyingAssetIds,
    underlyingAssetRatiosBaseUnit,
    cryptoAmountBaseUnit,
  } = props
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectMarketDataSortedByMarketCap)
  const underlyingAssetBalances = getUnderlyingAssetIdsBalances({
    assetId,
    underlyingAssetIds,
    underlyingAssetRatiosBaseUnit,
    cryptoAmountBaseUnit,
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
        <RawText>{translate('common.balance')}</RawText>
        <RawText>{translate('common.value')}</RawText>
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
          <AssetCell
            assetId={underlyingAssetId}
            subText='Liquidity Position'
            justifyContent='flex-start'
          />
          <Amount.Crypto
            value={bnOrZero(cryptoAmountBaseUnit)
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
          <Flex flexDir='column'>
            <Amount.Fiat
              color='chakra-body-text'
              fontSize='sm'
              fontWeight='medium'
              value={fiatAmount}
            />
            <Amount.Percent
              fontSize='xs'
              value={bnOrZero(marketData[asset.assetId]?.changePercent24Hr).div(100).toString()}
              autoColor
            />
          </Flex>
        </Button>
        {rewardAssetIds && (
          <List style={{ marginTop: 0 }}>
            {underlyingAssetIds.map(underlyingAssetId => {
              if (!underlyingAssetBalances[underlyingAssetId]) return null
              return (
                <RewardRow
                  isClaimableRewards={isClaimableRewards}
                  assetId={underlyingAssetId}
                  balances={underlyingAssetBalances[underlyingAssetId]}
                />
              )
            })}
          </List>
        )}
      </List>
    </Flex>
  )
}
