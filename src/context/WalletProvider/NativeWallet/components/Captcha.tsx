import { getConfig } from 'config'
import { WidgetInstance } from 'friendly-challenge'
import { useEffect, useRef } from 'react'

type FriendlyCaptchaProps = {
  handleCaptcha(solution: string | any): void
}

const siteKey = getConfig().REACT_APP_FRIENDLY_CAPTCHA_SITE_KEY

export const FriendlyCaptcha = ({ handleCaptcha }: FriendlyCaptchaProps) => {
  const container = useRef<HTMLDivElement | null>(null)
  const widget = useRef<WidgetInstance | undefined>()

  useEffect(() => {
    if (!widget.current && container.current) {
      widget.current = new WidgetInstance(container.current, {
        startMode: 'auto',
        doneCallback: handleCaptcha,
        errorCallback: handleCaptcha,
      })
    }

    return () => widget.current?.destroy?.()
  }, [container, handleCaptcha])

  return <div ref={container} className='frc-captcha' data-sitekey={siteKey} />
}
