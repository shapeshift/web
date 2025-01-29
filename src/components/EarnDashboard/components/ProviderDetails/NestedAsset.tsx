import { Button, Flex, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { NestedListItem } from 'components/List/NestedListItem'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText, Text } from 'components/Text'
import type { UnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { opportunityRowGrid } from './OpportunityTableHeader'

type NestedAssetProps = {
  assetId: AssetId
  balances: UnderlyingAssetIdsBalances
  isClaimableRewards: boolean
  isExternal?: boolean
  type: string
  onClick: () => void
}

const buttonDisabledStyle = { opacity: 1, cursor: 'default' }
const alignItemsMdFlexStart = { base: 'flex-end', md: 'flex-start' }

export const NestedAsset: React.FC<NestedAssetProps> = ({
  assetId,
  balances,
  isClaimableRewards,
  isExternal,
  type,
  onClick,
}) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  const subTextJoined = useMemo(() => {
    const typeElement = <RawText>{type}</RawText>
    const claimableElement = <Text color='green.200' translation='common.claimable' />
    const subText = [typeElement, ...(isClaimableRewards ? [claimableElement] : [])]
    return subText.map((element, index) => (
      <Flex gap={1} alignItems='center' key={`subText-${index}`}>
        {index > 0 && <RawText>•</RawText>}
        {element}
      </Flex>
    ))
  }, [isClaimableRewards, type])

  const subText = useMemo(
    () => (
      // this node is already memoized
      // eslint-disable-next-line react-memo/require-usememo
      <Flex gap={1} fontSize={{ base: 'xs', md: 'sm' }} lineHeight='shorter'>
        {subTextJoined}
      </Flex>
    ),
    [subTextJoined],
  )
  const assetCellAfter = useMemo(
    () => ({
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
      borderLeftStyle: 'solid',
      borderBottomWidth: 2,
      borderLeftWidth: 2,
      borderBottomStyle: 'solid',
      borderColor,
    }),
    [borderColor],
  )

  if (!asset) return null
  return (
    <NestedListItem>
      <Button
        variant='ghost'
        height='auto'
        py={4}
        display='grid'
        gridTemplateColumns={opportunityRowGrid}
        columnGap={4}
        alignItems='center'
        textAlign='left'
        isDisabled={!isClaimableRewards}
        _disabled={buttonDisabledStyle}
        onClick={onClick}
      >
        <AssetCell
          className='reward-asset'
          assetId={assetId}
          subText={subText}
          position='relative'
          isExternal={isExternal}
          _after={assetCellAfter}
          showAssetSymbol={true}
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
        <Flex flexDir='column' alignItems={alignItemsMdFlexStart}>
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
    </NestedListItem>
  )
}
