import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { WordsErrorModal } from '../../components/WordsErrorModal'

export const NativeWordsError = () => {
  const navigate = useNavigate()

  const handleRetry = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const handleReviewPhrase = useCallback(() => {
    navigate(-2)
  }, [navigate])

  return <WordsErrorModal onRetry={handleRetry} onReviewPhrase={handleReviewPhrase} />
}
