import type { Request, Response } from 'express'
import { z } from 'zod'

import { quoteStore } from '../lib/quoteStore'
import type { ErrorResponse } from '../types'

export const RegisterRequestSchema = z.object({
  quoteId: z.string().uuid(),
  txHash: z.string().min(1),
  chainId: z.string().min(1),
})

export const registerSwap = (req: Request, res: Response): void => {
  try {
    const parseResult = RegisterRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: parseResult.error.errors,
      } as ErrorResponse)
      return
    }

    const { quoteId, txHash, chainId } = parseResult.data

    const storedQuote = quoteStore.get(quoteId)

    if (!storedQuote) {
      res.status(404).json({
        error: 'Quote not found or expired',
        code: 'QUOTE_NOT_FOUND',
      } as ErrorResponse)
      return
    }

    if (storedQuote.sellChainId !== chainId) {
      res.status(400).json({
        error: 'Chain ID does not match the quote sell chain',
        code: 'CHAIN_MISMATCH',
        details: { expected: storedQuote.sellChainId, received: chainId },
      } as ErrorResponse)
      return
    }

    const requestAffiliate = req.affiliateInfo?.affiliateAddress
    if (
      storedQuote.affiliateAddress &&
      requestAffiliate &&
      storedQuote.affiliateAddress !== requestAffiliate
    ) {
      res.status(403).json({
        error: 'Affiliate address does not match the original quote',
        code: 'AFFILIATE_MISMATCH',
      } as ErrorResponse)
      return
    }

    if (storedQuote.txHash && storedQuote.txHash !== txHash) {
      res.status(409).json({
        error: 'Quote already bound to a different transaction',
        code: 'TX_HASH_MISMATCH',
      } as ErrorResponse)
      return
    }

    if (storedQuote.txHash === txHash) {
      res.json({
        quoteId,
        txHash,
        chainId,
        status: storedQuote.status,
        swapperName: storedQuote.swapperName,
      })
      return
    }

    storedQuote.txHash = txHash
    storedQuote.registeredAt = Date.now()
    storedQuote.status = 'submitted'
    quoteStore.set(quoteId, storedQuote)

    res.json({
      quoteId,
      txHash,
      chainId,
      status: 'submitted',
      swapperName: storedQuote.swapperName,
    })
  } catch (error) {
    console.error('Error in registerSwap:', error)
    res.status(500).json({ error: 'Internal server error' } as ErrorResponse)
  }
}
