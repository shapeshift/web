import { Button, Flex, List, ListItem, Tag, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText, Text } from 'components/Text'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import type { UnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import { getRewardBalances } from 'state/slices/opportunitiesSlice/utils'
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
  onClick: () => void
}

const RewardRow: React.FC<RewardRowProps> = ({
  assetId,
  balances,
  isClaimableRewards,
  onClick,
}) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const subText = [<Text translation='common.reward' />]
  if (isClaimableRewards) subText.push(<Text color='green.200' translation='common.claimable' />)
  const subTextJoined = subText.map((element, index) => (
    <>
      {index > 0 && <RawText>•</RawText>}
      {element}
    </>
  ))
  if (!asset) return null
  return (
    <ListItem
      display='grid'
      pl={{ base: 0, md: '3rem' }}
      position='relative'
      _before={{
        content: '""',
        position: 'absolute',
        top: {
          base: 'auto',
          md: 0,
        },
        bottom: {
          base: '2rem',
          md: 0,
        },
        height: {
          base: '3.5rem',
          md: 'auto',
        },
        left: 'calc(2rem - 1px)',
        display: 'block',
        width: 0,
        borderLeftWidth: 2,
        borderColor: 'gray.700',
      }}
      _last={{
        ':before': {
          height: {
            base: '3.5rem',
            md: '1.5rem',
          },
          bottom: {
            base: '2rem',
            md: 'auto',
          },
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
        gridTemplateColumns={{
          base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
          md: '1fr repeat(2, 170px)',
        }}
        columnGap={4}
        alignItems='center'
        textAlign='left'
        isDisabled={!isClaimableRewards}
        _disabled={{ opacity: 1, cursor: 'default' }}
        onClick={onClick}
      >
        <AssetCell
          className='reward-asset'
          assetId={assetId}
          subText={
            <Flex gap={1} fontSize={{ base: 'xs', md: 'sm' }} lineHeight='shorter'>
              {subTextJoined}
            </Flex>
          }
          position='relative'
          _after={{
            content: '""',
            position: 'absolute',
            left: 'calc(-1 * 2rem - 1px)',
            display: {
              base: 'none',
              md: 'block',
            },
            height: '50%',
            marginTop: '-1em',
            width: '1em',
            borderBottomWidth: 2,
            borderLeftWidth: 2,
            borderColor: 'gray.700',
          }}
        />
        <Amount.Crypto
          value={balances.cryptoBalancePrecision}
          symbol={asset.symbol}
          fontSize='sm'
          fontWeight='medium'
          color='chakra-body-text'
          display={{ base: 'none', md: 'block ' }}
          whiteSpace='break-spaces'
        />
        <Flex flexDir='column' alignItems={{ base: 'flex-end', md: 'flex-start' }}>
          <Amount.Fiat
            color='chakra-body-text'
            fontSize='sm'
            fontWeight='medium'
            value={balances.fiatAmount}
            height='20px'
            lineHeight='shorter'
          />
          <Amount.Percent
            value={bnOrZero(marketData.changePercent24Hr).div(100).toString()}
            autoColor
            size='xs'
            fontSize='xs'
            lineHeight='shorter'
          />
        </Flex>
      </Button>
    </ListItem>
  )
}
type StakingOpporityProps = {
  onClick: (opportunity: StakingEarnOpportunityType, action: DefiAction) => void
} & StakingEarnOpportunityType
export const StakingOppority: React.FC<StakingOpporityProps> = ({ onClick, ...opportunity }) => {
  const {
    underlyingAssetId,
    fiatAmount,
    stakedAmountCryptoBaseUnit,
    rewardAssetIds,
    rewardsCryptoBaseUnit,
    isClaimableRewards,
    type,
    apy,
  } = opportunity
  const borderColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const asset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectMarketDataSortedByMarketCap)
  const rewardBalances = getRewardBalances({
    rewardAssetIds,
    rewardsCryptoBaseUnit,
    assets,
    marketData,
  })
  const handleClick = useCallback(
    (action: DefiAction) => {
      onClick(opportunity, action)
    },
    [onClick, opportunity],
  )
  const subText = [<Amount.Percent value={bnOrZero(apy).toString()} suffix='APY' autoColor />]
  if (bnOrZero(stakedAmountCryptoBaseUnit).gt(0))
    subText.push(<RawText textTransform='capitalize'>{type}</RawText>)
  const subTextJoined = subText.map((element, index) => (
    <>
      {index > 0 && <RawText>•</RawText>}
      {element}
    </>
  ))
  if (!asset) return null
  return (
    <Flex
      flexDir='column'
      gap={4}
      borderBottomWidth={1}
      borderColor={borderColor}
      _last={{ borderBottomWidth: 0 }}
    >
      <List ml={0} mt={0} spacing={4} position='relative'>
        <Button
          variant='ghost'
          py={4}
          width='full'
          height='auto'
          display='grid'
          gridTemplateColumns={{
            base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
            md: '1fr repeat(2, 170px)',
          }}
          columnGap={4}
          alignItems='center'
          textAlign='left'
          onClick={() => handleClick(DefiAction.Overview)}
        >
          <AssetCell
            assetId={underlyingAssetId}
            subText={
              <Flex gap={1} fontSize={{ base: 'xs', md: 'sm' }} lineHeight='shorter'>
                {subTextJoined}
              </Flex>
            }
            justifyContent='flex-start'
          />
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
          <Flex flexDir='column' alignItems={{ base: 'flex-end', md: 'flex-start' }}>
            <Amount.Fiat
              color='chakra-body-text'
              fontSize='sm'
              fontWeight='medium'
              value={fiatAmount}
              height='20px'
              lineHeight='shorter'
            />
            <Amount.Percent
              value={bnOrZero(marketData[asset.assetId]?.changePercent24Hr).div(100).toString()}
              autoColor
              fontSize='xs'
              lineHeight='shorter'
            />
          </Flex>
        </Button>
        {rewardAssetIds && (
          <List style={{ marginTop: 0 }}>
            {rewardAssetIds.map(rewardAssetId => {
              if (!rewardBalances[rewardAssetId]) return null
              if (bnOrZero(rewardBalances[rewardAssetId].cryptoBalancePrecision).eq(0)) return null
              return (
                <RewardRow
                  isClaimableRewards={isClaimableRewards}
                  assetId={rewardAssetId}
                  balances={rewardBalances[rewardAssetId]}
                  onClick={() => handleClick(DefiAction.Claim)}
                />
              )
            })}
          </List>
        )}
      </List>
    </Flex>
  )
}
