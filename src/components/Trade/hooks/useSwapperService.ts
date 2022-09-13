import { useFormContext } from 'react-hook-form'
import { useAccountsService } from 'components/Trade/hooks/useAccountsService'
import { useFeesService } from 'components/Trade/hooks/useFeesService'
import { useFiatRateService } from 'components/Trade/hooks/useFiatRateService'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'
import type { TS } from 'components/Trade/types'

/*
The Swapper Service is responsible for reacting to changes to the Trade form and updating state accordingly.
*/
export const useSwapperService = () => {
  const { getValues } = useFormContext<TS>()
  console.log('xxx useSwapperService getValues', getValues())

  // Initialize child services
  useFiatRateService()
  useTradeQuoteService()
  useFeesService()
  useAccountsService()
}
