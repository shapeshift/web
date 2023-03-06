import { useReceiveAddress } from 'components/Trade/hooks/useReceiveAddress'

/*
The Swapper Service is responsible for reacting to changes to the Trade form and updating state accordingly.
*/
export const useSwapperService = () => {
  // Initialize child services
  useReceiveAddress()
}
