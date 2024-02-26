import type { SlideTransitionProps } from 'components/SlideTransition'
import { SlideTransition } from 'components/SlideTransition'

export const transitionStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const TradeSlideTransition = (props: SlideTransitionProps) => (
  <SlideTransition style={transitionStyle} {...props} />
)
