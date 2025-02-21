import { useTranslate } from 'react-polyglot'
import { formatSecondsToDuration } from 'lib/utils/time'

import type { AcknowledgementProps } from '@/components/Acknowledgement/Acknowledgement'
import { Acknowledgement } from '@/components/Acknowledgement/Acknowledgement'
import { StreamIcon } from '@/components/Icons/Stream'

type StreamingAcknowledgementProps = Omit<AcknowledgementProps, 'message'> & {
  estimatedTimeMs: number
}

export const StreamingAcknowledgement = ({
  estimatedTimeMs,
  ...restProps
}: StreamingAcknowledgementProps) => {
  const translate = useTranslate()

  return (
    <Acknowledgement
      {...restProps}
      buttonColorScheme='blue'
      buttonTranslation='common.continue'
      message={translate('streamingAcknowledgement.description', {
        estimatedTimeHuman: formatSecondsToDuration(estimatedTimeMs / 1000),
      })}
      icon={StreamIcon}
    />
  )
}
