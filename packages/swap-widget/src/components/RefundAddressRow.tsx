import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { getChainName } from '../constants/chains'
import type { ChainId } from '../types'
import { truncateAddress } from '../types'
import { getAddressFormatHint, validateAddress } from '../utils/addressValidation'

type RefundAddressRowProps = {
  sendAddress: string | undefined
  sellChainId: ChainId
  onSetCustomSendAddress: (address: string) => void
}

export const RefundAddressRow = ({
  sendAddress,
  sellChainId,
  onSetCustomSendAddress,
}: RefundAddressRowProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [hasInteracted, setHasInteracted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const showInput = !sendAddress || isEditing

  useLayoutEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  useLayoutEffect(() => {
    setDraft('')
    setHasInteracted(false)
    setIsEditing(false)
  }, [sellChainId])

  const trimmedDraft = useMemo(() => draft.trim(), [draft])

  const validation = useMemo(() => {
    if (!trimmedDraft || !hasInteracted) return { valid: true, error: undefined }
    return validateAddress(trimmedDraft, sellChainId)
  }, [trimmedDraft, hasInteracted, sellChainId])

  const canAccept = useMemo(
    () => !!trimmedDraft && validateAddress(trimmedDraft, sellChainId).valid,
    [trimmedDraft, sellChainId],
  )

  const formatHint = useMemo(() => getAddressFormatHint(sellChainId), [sellChainId])
  const chainName = useMemo(() => getChainName(sellChainId), [sellChainId])

  const startEditing = useCallback(() => {
    setDraft(sendAddress ?? '')
    setHasInteracted(false)
    setIsEditing(true)
  }, [sendAddress])

  const handleChange = useCallback((value: string) => {
    setDraft(value)
    setHasInteracted(true)
  }, [])

  const handleAccept = useCallback(() => {
    if (!validateAddress(trimmedDraft, sellChainId).valid) return
    onSetCustomSendAddress(trimmedDraft)
    setIsEditing(false)
    setHasInteracted(false)
  }, [trimmedDraft, sellChainId, onSetCustomSendAddress])

  const handleReset = useCallback(() => {
    onSetCustomSendAddress('')
    setDraft('')
    setHasInteracted(false)
    setIsEditing(false)
  }, [onSetCustomSendAddress])

  if (!showInput) {
    return (
      <div className='ssw-receive-row-resolved'>
        <span className='ssw-receive-label'>Refund address</span>
        <div className='ssw-receive-resolved-value'>
          <span className='ssw-receive-address'>{truncateAddress(sendAddress ?? '', 6)}</span>
          <button
            className='ssw-receive-edit-btn'
            onClick={startEditing}
            type='button'
            aria-label='Edit refund address'
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
              <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='ssw-receive-row-input'>
      <div className='ssw-receive-header'>
        <span className='ssw-receive-label'>Refund address</span>
      </div>

      <div
        className={`ssw-receive-input-wrapper${
          !validation.valid && hasInteracted ? ' ssw-invalid' : ''
        }`}
      >
        <input
          ref={inputRef}
          type='text'
          className='ssw-receive-input'
          placeholder={formatHint}
          value={draft}
          onChange={e => handleChange(e.target.value)}
          spellCheck={false}
          autoComplete='off'
          aria-label='Refund address'
        />
        <div className='ssw-receive-inline-actions'>
          <button
            className='ssw-receive-icon-btn ssw-receive-accept'
            onClick={handleAccept}
            onMouseDown={e => e.preventDefault()}
            disabled={!canAccept}
            type='button'
            aria-label='Accept refund address'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
            >
              <path d='M20 6L9 17l-5-5' />
            </svg>
          </button>
          {(!!draft || isEditing) && (
            <button
              className='ssw-receive-icon-btn ssw-receive-reset'
              onClick={handleReset}
              onMouseDown={e => e.preventDefault()}
              type='button'
              aria-label='Reset refund address'
            >
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
              >
                <path d='M18 6L6 18M6 6l12 12' />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!validation.valid && hasInteracted && validation.error ? (
        <span className='ssw-receive-error'>{validation.error}</span>
      ) : (
        <span className='ssw-receive-hint'>Your {chainName} address - funds return here if the swap fails</span>
      )}
    </div>
  )
}
