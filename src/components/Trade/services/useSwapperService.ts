import { useAccountsService } from 'components/Trade/services/useAccountsService'
import { useFeesService } from 'components/Trade/services/useFeesService'
import { useFiatRateService } from 'components/Trade/services/useFiatRateService'
import { useTradeQuoteService } from 'components/Trade/services/useTradeQuoteService'

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
