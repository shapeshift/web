import { Flex, forwardRef } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { LpEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import type { GlobalSearchResult } from 'state/slices/search-selectors'
import { GlobalSearchResultType } from 'state/slices/search-selectors'

import { ResultButton } from '../ResultButton'

type LpResultProps = {
  opportunity: LpEarnOpportunityType
  index: number
  activeIndex?: number
  onClick: (arg: GlobalSearchResult) => void
}

export const LpResult = forwardRef<LpResultProps, 'div'>(
  ({ opportunity, onClick, index, activeIndex }, ref) => {
    const selected = activeIndex === index
    const { apy, type, cryptoAmountBaseUnit } = opportunity
    const subTextJoined = useMemo(() => {
      const aprElement = <Amount.Percent value={bnOrZero(apy).toString()} suffix='APY' autoColor />
      const hasBalanceElement = <RawText textTransform='capitalize'>{type}</RawText>
      const subText = [
        aprElement,
        ...(bnOrZero(cryptoAmountBaseUnit).gt(0) ? [hasBalanceElement] : []),
      ]

      return subText.map((element, index) => (
        <Flex gap={1} alignItems='center' key={`subtext-${index}`}>
          {index > 0 && <RawText>•</RawText>}
          {element}
        </Flex>
      ))
    }, [apy, cryptoAmountBaseUnit, type])

    if (!opportunity) return null
    return (
      <ResultButton
        ref={ref}
        aria-selected={selected ? true : undefined}
        onClick={() => onClick({ type: GlobalSearchResultType.LpOpportunity, id: opportunity.id })}
      >
        <Flex gap={2} flex={1}>
          <AssetCell
            isExternal={opportunity.isReadOnly}
            assetId={opportunity.underlyingAssetId}
            icons={opportunity.icons}
            justifyContent='flex-start'
            subText={
              <Flex gap={1} fontSize={{ base: 'xs', md: 'sm' }} lineHeight='shorter'>
                {subTextJoined}
              </Flex>
            }
          />
        </Flex>
        {bnOrZero(opportunity.fiatAmount).gt(0) && (
          <Flex flexDir='column' alignItems='flex-end'>
            <Amount.Fiat
              color='chakra-body-text'
              fontSize='sm'
              fontWeight='medium'
              value={opportunity.fiatAmount}
              height='20px'
              lineHeight='shorter'
            />
          </Flex>
        )}
      </ResultButton>
    )
  },
)
