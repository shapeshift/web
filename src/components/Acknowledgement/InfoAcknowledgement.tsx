import type { AcknowledgementProps } from './Acknowledgement'
import { Acknowledgement } from './Acknowledgement'

export const InfoAcknowledgement = (props: AcknowledgementProps) =>
  Acknowledgement({ ...props, buttonColorScheme: 'blue', iconColorScheme: 'yellow' })
