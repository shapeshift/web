import { Button, Flex, ListItem, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { Amount } from 'components/Amount/Amount'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText, Text } from 'components/Text'
import type { UnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { OpportunityRowGrid } from './OpportunityTableHeader'

type NestedAssetProps = {
  assetId: AssetId
  balances: UnderlyingAssetIdsBalances
  isClaimableRewards: boolean
  type: string
  onClick: () => void
}

export const NestedAsset: React.FC<NestedAssetProps> = ({
  assetId,
  balances,
  isClaimableRewards,
  type,
  onClick,
}) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const subText = [<RawText>{type}</RawText>]
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
        borderColor,
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
        gridTemplateColumns={OpportunityRowGrid}
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
            borderColor,
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
