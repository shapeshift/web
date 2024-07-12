import { ChevronDownIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import { Flex, Skeleton, useDisclosure } from '@chakra-ui/react'
import type { ResponsiveValue } from '@chakra-ui/system'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { Property } from 'csstype'
import { memo, useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { MobileWalletDialog } from 'components/MobileWalletDialog/MobileWalletDialog'
import { useFetchOpportunities } from 'components/StakingVaults/hooks/useFetchOpportunities'
import { Text } from 'components/Text'
import {
  selectClaimableRewards,
  selectEarnBalancesUserCurrencyAmountFull,
  selectPortfolioLoading,
  selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const balanceFontSize = { base: '2xl', md: '4xl' }
const balanceFlexDir: ResponsiveValue<Property.FlexDirection> = {
  base: 'column-reverse',
  md: 'column',
}
const portfolioTextAlignment: ResponsiveValue<Property.AlignItems> = {
  base: 'center',
  md: 'flex-start',
}

const balanceActive = { opacity: 0.5 }

type WalletBalanceProps = {
  label?: string
  alignItems?: FlexProps['alignItems']
}
export const WalletBalance: React.FC<WalletBalanceProps> = memo(
  ({ label = 'defi.netWorth', alignItems }) => {
    const { isLoading: isOpportunitiesLoading } = useFetchOpportunities()
    const { onToggle, isOpen, onClose } = useDisclosure()
    const isPortfolioLoading = useAppSelector(selectPortfolioLoading)
    const claimableRewardsUserCurrencyBalanceFilter = useMemo(() => ({}), [])
    const claimableRewardsUserCurrencyBalance = useAppSelector(state =>
      selectClaimableRewards(state, claimableRewardsUserCurrencyBalanceFilter),
    )
    const earnUserCurrencyBalance = useAppSelector(
      selectEarnBalancesUserCurrencyAmountFull,
    ).toFixed()
    const portfolioTotalUserCurrencyBalance = useAppSelector(
      selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
    )
    const netWorth = useMemo(
      () =>
        bnOrZero(earnUserCurrencyBalance)
          .plus(portfolioTotalUserCurrencyBalance)
          .plus(claimableRewardsUserCurrencyBalance)
          .toFixed(),
      [
        claimableRewardsUserCurrencyBalance,
        earnUserCurrencyBalance,
        portfolioTotalUserCurrencyBalance,
      ],
    )
    return (
      <Flex flexDir={balanceFlexDir} alignItems={alignItems ?? portfolioTextAlignment}>
        <Text fontWeight='medium' translation={label} color='text.subtle' />
        <Skeleton isLoaded={!isPortfolioLoading && !isOpportunitiesLoading}>
          <Flex alignItems='center' gap={1} onClick={onToggle} _active={balanceActive}>
            <Amount.Fiat
              lineHeight='shorter'
              value={netWorth}
              fontSize={balanceFontSize}
              fontWeight='semibold'
            />
            <ChevronDownIcon boxSize='24px' />
          </Flex>
        </Skeleton>
        <MobileWalletDialog isOpen={isOpen} onClose={onClose} />
      </Flex>
    )
  },
)
