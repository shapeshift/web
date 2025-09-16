import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Routes } from 'react-router-dom'

import { SingleTransaction } from './SingleTransaction'

import { SEO } from '@/components/Layout/Seo'
import { TransactionHistoryContent } from '@/components/TransactionHistory/TransactionHistoryContent'

const singleTransaction = <SingleTransaction />

const TransactionHistoryPage = () => {
  const translate = useTranslate()
  return (
    <>
      <SEO title={translate('transactionHistory.transactionHistory')} />
      <TransactionHistoryContent />
    </>
  )
}

const transactionHistory = <TransactionHistoryPage />

export const TransactionHistory = memo(() => {
  return (
    <Routes>
      <Route path='/' element={transactionHistory} />
      <Route path='/transaction/:txId' element={singleTransaction} />
    </Routes>
  )
})
