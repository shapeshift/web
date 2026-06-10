import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'

type WidgetModalProps = {
  children: ReactNode
}

export const WidgetModal = ({ children }: WidgetModalProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, close])

  return (
    <>
      <div className='demo-launch'>
        <button className='demo-launch-btn' onClick={open} type='button'>
          <svg
            width='18'
            height='18'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <path d='M17 1l4 4-4 4' />
            <path d='M3 11V9a4 4 0 0 1 4-4h14' />
            <path d='M7 23l-4-4 4-4' />
            <path d='M21 13v2a4 4 0 0 1-4 4H3' />
          </svg>
          Swap crypto
        </button>
      </div>

      {isOpen && (
        <div className='demo-modal-overlay'>
          <button
            className='demo-modal-backdrop'
            onClick={close}
            type='button'
            aria-label='Close'
          />
          <div className='demo-modal' role='dialog' aria-modal='true' aria-label='Swap'>
            <button className='demo-modal-close' onClick={close} type='button' aria-label='Close'>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M18 6L6 18M6 6l12 12' />
              </svg>
            </button>
            {children}
          </div>
        </div>
      )}
    </>
  )
}
