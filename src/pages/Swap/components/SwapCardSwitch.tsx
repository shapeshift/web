import { SwapCardClassic } from './SwapCardClassic'
import { SwapCardModern } from './SwapCardModern'

export type SwapCardProps = {
  currentStep: string
  exchangeRate: number
  receiveAmount: number
  handleClickNext: () => void
  selectedAsset: string
  setAsset: (asset: string) => void
  selectedOtherAsset: string
  shouldShowClassicVersion: boolean
  role: string
}

export const SwapCardSwitch = ({ shouldShowClassicVersion, ...rest }: SwapCardProps) =>
  shouldShowClassicVersion ? <SwapCardClassic {...rest} /> : <SwapCardModern {...rest} />
