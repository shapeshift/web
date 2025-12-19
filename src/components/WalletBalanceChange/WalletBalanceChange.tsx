import type { FlexProps } from '@chakra-ui/react'
import { Flex, Heading, Skeleton, useColorModeValue } from '@chakra-ui/react'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useBalanceChartData } from '@/hooks/useBalanceChartData/useBalanceChartData'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bn } from '@/lib/bignumber/bignumber'
import { calculateFiatChange, calculatePercentChange } from '@/lib/charts'
import { ErroredTxHistoryAccounts } from '@/pages/Dashboard/components/ErroredTxHistoryAccounts'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import {
  selectIsPortfolioLoading,
  selectPortfolioTotalUserCurrencyBalance,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type WalletBalanceChangeProps = {
  showErroredAccounts?: boolean
} & FlexProps

export const WalletBalanceChange = memo(
  ({ showErroredAccounts = true, ...flexProps }: WalletBalanceChangeProps) => {
    const {
      state: { isConnected: isWalletConnected },
    } = useWallet()
    const walletType = useAppSelector(selectWalletType)
    const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')
    const isLedgerReadOnly = isLedgerReadOnlyEnabled && walletType === KeyManager.Ledger
    const isConnected = isWalletConnected || isLedgerReadOnly

    const translate = useTranslate()
    const portfolioTotalUserCurrencyBalance = useAppSelector(state =>
      isConnected ? selectPortfolioTotalUserCurrencyBalance(state) : '0',
    )
    const loading = useAppSelector(selectIsPortfolioLoading)
    const isLoaded = !loading

    const positiveColor = useColorModeValue('green.500', 'green.400')
    const negativeColor = useColorModeValue('red.500', 'red.400')

    const { balanceChartData, balanceChartDataLoading } = useBalanceChartData(HistoryTimeframe.DAY)
    const { total } = balanceChartData

    const percentChange = useMemo(() => calculatePercentChange(total), [total])
    const fiatChange = useMemo(() => calculateFiatChange(total), [total])

    const isChangeLoaded = !balanceChartDataLoading && total.length > 0

    const color = percentChange >= 0 ? positiveColor : negativeColor

    const formattedPercentChange = useMemo(() => {
      return `${percentChange.toFixed(1)}%`
    }, [percentChange])

    return (
      <Flex flexDir='column' justifyContent='center' alignItems='center' {...flexProps}>
        <Flex>
          <Heading as='h2' fontSize='4xl' lineHeight='1' mr={2}>
            <Skeleton isLoaded={isLoaded}>
              <Amount.Fiat value={portfolioTotalUserCurrencyBalance} />
            </Skeleton>
          </Heading>
          {showErroredAccounts && <ErroredTxHistoryAccounts />}
        </Flex>
        {bn(percentChange).isFinite() && (
          <Skeleton mt={2} isLoaded={isChangeLoaded}>
            <TooltipWithTouch label={translate('defi.walletBalanceChange24Hr')}>
              <Flex gap={1} fontSize='md' color={color} fontWeight='medium'>
                <Amount.Fiat value={fiatChange} /> ({formattedPercentChange})
              </Flex>
            </TooltipWithTouch>
          </Skeleton>
        )}
      </Flex>
    )
  },
)

WalletBalanceChange.displayName = 'WalletBalanceChange'
