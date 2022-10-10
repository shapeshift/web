import { useAccountsService } from 'components/Trade/hooks/useAccountsService'
import { useFeesService } from 'components/Trade/hooks/useFeesService'
import { useFiatRateService } from 'components/Trade/hooks/useFiatRateService'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'

/*
The Swapper Service is responsible for reacting to changes to the Trade form and updating state accordingly.
*/
export const useSwapperService = () => {
  // Initialize child services
  useFiatRateService()
  useTradeQuoteService()
  useFeesService()
  useAccountsService()
}
