import { getConfig } from 'config'
import { WidgetInstance } from 'friendly-challenge'
import { useEffect, useRef } from 'react'
import { isMobile } from 'lib/globals'

type FriendlyCaptchaProps = {
  handleCaptcha(solution: string | any): void
  solution: string | null
}

const siteKey = getConfig().REACT_APP_FRIENDLY_CAPTCHA_SITE_KEY

export const FriendlyCaptcha = ({ handleCaptcha, solution }: FriendlyCaptchaProps) => {
  const container = useRef<HTMLDivElement | null>(null)
  const widget = useRef<WidgetInstance | undefined>()

  useEffect(() => {
    if (widget.current && !solution) {
      widget.current?.reset?.()
    }
  }, [solution])

  useEffect(() => {
    if (!widget.current && container.current) {
      widget.current = new WidgetInstance(container.current, {
        startMode: 'auto',
        doneCallback: handleCaptcha,
        errorCallback: handleCaptcha,
      })
    }

    // In the mobile app, this unmount function destroys the CAPTCHA before it renders
    // Removing this still works with BACK and CLOSE
    return () => void (!isMobile && widget.current?.destroy?.())
  }, [container, handleCaptcha])

  return (
    <div
      style={{ margin: '0 auto' }}
      ref={container}
      className='frc-captcha'
      data-sitekey={siteKey}
    />
  )
}
