import { useFiatRateService } from 'components/Trade/services/useFiatRateService'
import { useTradeAmountService } from 'components/Trade/services/useTradeAmountService'

/*
The Swapper Service is responsible for reacting to changes to the Trade form and updating state accordingly.
It will reactively:
- Fetch and poll for trade quotes
- Fetch and poll for USD rates
- Fetch trade amounts (buy and sell)
*/
export const useSwapperService = () => {
  // Initialise child services
  useFiatRateService()
  useTradeAmountService()
  useTradeAmountService()
}
