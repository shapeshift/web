import { getConfig } from 'config'
import { WidgetInstance } from 'friendly-challenge'
import { useEffect, useRef } from 'react'

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

    // The unmount function was destroying the CAPTCHA before it renders
    // Removing this still works with BACK and CLOSE
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
