import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { WordsErrorModal } from '../../components/WordsErrorModal'
import { NativeWalletRoutes } from '../../types'

export const NativeWordsError = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const { vault } = location.state

  const handleRetry = useCallback(() => {
    navigate(NativeWalletRoutes.CreateTest, { state: { vault }, replace: true })
  }, [navigate, vault])

  const handleReviewPhrase = useCallback(() => {
    navigate(NativeWalletRoutes.Create, { state: { vault }, replace: true })
  }, [navigate, vault])

  return <WordsErrorModal onRetry={handleRetry} onReviewPhrase={handleReviewPhrase} />
}
