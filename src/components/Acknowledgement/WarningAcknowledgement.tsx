import type { AcknowledgementProps } from './Acknowledgement'
import { Acknowledgement } from './Acknowledgement'

export const WarningAcknowledgement = (props: AcknowledgementProps) =>
  Acknowledgement({ ...props, buttonColorScheme: 'red', iconColorScheme: 'red' })
