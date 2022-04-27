import { WidgetInstance } from 'friendly-challenge'
import { useCallback, useEffect, useRef } from 'react'

type FriendlyCaptchaProps = {
  handleCaptcha(solution: string | any): void
}

export const FriendlyCaptcha = ({ handleCaptcha }: FriendlyCaptchaProps) => {
  const container = useRef<HTMLDivElement | null>(null)
  const widget = useRef<WidgetInstance | undefined>()

  const doneCallback = useCallback(
    (solution: string) => {
      handleCaptcha(solution)
    },
    [handleCaptcha],
  )

  const errorCallback = useCallback(
    (err: any) => {
      handleCaptcha(err)
    },
    [handleCaptcha],
  )

  useEffect(() => {
    if (!widget.current && container.current) {
      widget.current = new WidgetInstance(container.current, {
        startMode: 'auto',
        doneCallback: doneCallback,
        errorCallback: errorCallback,
      })
    }

    return () => {
      if (widget.current !== undefined) widget.current.destroy()
    }
  }, [container, doneCallback, errorCallback])

  return <div ref={container} className='frc-captcha' data-sitekey='<site_key>' />
}
