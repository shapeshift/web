import type { Request, Response } from 'express'

import { env } from '../../env'
import { fetchSwapService } from '../../lib/fetchSwapService'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import {
  AddAffiliateMemberRequestSchema,
  AffiliateAddressParamsSchema,
  AffiliateMemberParamsSchema,
  AffiliateMembersResponseSchema,
} from './types'

const SIWE_NOTE =
  'Requires a valid SIWE JWT in the Authorization header whose address equals {address}; that wallet may be the owner or any admin of the affiliate.'

const memberResponses = {
  200: {
    description: 'Owner and admins of the affiliate',
    content: { 'application/json': { schema: AffiliateMembersResponseSchema } },
  },
  400: { description: 'Invalid request' },
  401: { description: 'Unauthorized' },
  403: { description: 'Forbidden' },
  404: { description: 'Affiliate or member not found' },
  429: rateLimitResponse,
  500: { description: 'Internal server error' },
  503: { description: 'Swap service unavailable' },
  504: { description: 'Swap service timed out' },
}

registry.registerPath({
  method: 'get',
  path: '/v1/affiliate/{address}/members',
  operationId: 'getAffiliateMembers',
  summary: 'List affiliate members',
  description: `List the owner and admin wallets of an affiliate. ${SIWE_NOTE}`,
  tags: ['Affiliate'],
  request: { params: AffiliateAddressParamsSchema },
  responses: memberResponses,
})

registry.registerPath({
  method: 'post',
  path: '/v1/affiliate/{address}/members',
  operationId: 'addAffiliateMember',
  summary: 'Add affiliate admin',
  description: `Grant another wallet admin access to the affiliate. ${SIWE_NOTE}`,
  tags: ['Affiliate'],
  request: {
    params: AffiliateAddressParamsSchema,
    body: { content: { 'application/json': { schema: AddAffiliateMemberRequestSchema } } },
  },
  responses: { ...memberResponses, 409: { description: 'Wallet already belongs to an affiliate' } },
})

registry.registerPath({
  method: 'delete',
  path: '/v1/affiliate/{address}/members/{memberAddress}',
  operationId: 'removeAffiliateMember',
  summary: 'Remove affiliate admin',
  description: `Revoke a wallet's admin access to the affiliate. ${SIWE_NOTE}`,
  tags: ['Affiliate'],
  request: { params: AffiliateMemberParamsSchema },
  responses: memberResponses,
})

type ProxyArgs = {
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  authorization: string
  body?: unknown
}

const proxyMembers = async (res: Response, args: ProxyArgs): Promise<void> => {
  const response = await fetchSwapService(res, `${env.SWAP_SERVICE_BASE_URL}${args.path}`, {
    method: args.method,
    headers: {
      Authorization: args.authorization,
      ...(args.body !== undefined && { 'Content-Type': 'application/json' }),
    },
    ...(args.body !== undefined && { body: JSON.stringify(args.body) }),
  })

  if (!response) return

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Upstream error' }))
    res.status(response.status).json(body)
    return
  }

  const responseResult = AffiliateMembersResponseSchema.safeParse(
    await response.json().catch(() => null),
  )

  if (!responseResult.success) {
    console.error(
      `Unexpected response shape from swap-service ${args.method} ${args.path}:`,
      responseResult.error.errors,
    )
    res.status(503).json({
      error: 'Invalid response from swap service',
      code: 'INVALID_RESPONSE',
    } satisfies ErrorResponse)
    return
  }

  res.status(200).json(responseResult.data)
}

const requireAuth = (req: Request, res: Response): string | null => {
  if (typeof req.headers.authorization === 'string') return req.headers.authorization
  res
    .status(401)
    .json({ error: 'Authorization header required', code: 'UNAUTHORIZED' } satisfies ErrorResponse)
  return null
}

const invalidRequest = (res: Response, error: string, details: unknown): void => {
  res.status(400).json({ error, code: 'INVALID_REQUEST', details } satisfies ErrorResponse)
}

export const getAffiliateMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorization = requireAuth(req, res)
    if (!authorization) return

    const paramsResult = AffiliateAddressParamsSchema.safeParse(req.params)
    if (!paramsResult.success) {
      invalidRequest(res, 'Invalid address format', paramsResult.error.errors)
      return
    }

    await proxyMembers(res, {
      method: 'GET',
      authorization,
      path: `/v1/affiliate/${paramsResult.data.address}/members`,
    })
  } catch (error) {
    console.error('Unexpected error in getAffiliateMembers:', error)
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' } satisfies ErrorResponse)
  }
}

export const addAffiliateMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorization = requireAuth(req, res)
    if (!authorization) return

    const paramsResult = AffiliateAddressParamsSchema.safeParse(req.params)
    if (!paramsResult.success) {
      invalidRequest(res, 'Invalid address format', paramsResult.error.errors)
      return
    }

    const bodyResult = AddAffiliateMemberRequestSchema.safeParse(req.body)
    if (!bodyResult.success) {
      invalidRequest(res, 'Invalid request body', bodyResult.error.errors)
      return
    }

    await proxyMembers(res, {
      method: 'POST',
      authorization,
      path: `/v1/affiliate/${paramsResult.data.address}/members`,
      body: bodyResult.data,
    })
  } catch (error) {
    console.error('Unexpected error in addAffiliateMember:', error)
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' } satisfies ErrorResponse)
  }
}

export const removeAffiliateMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorization = requireAuth(req, res)
    if (!authorization) return

    const paramsResult = AffiliateMemberParamsSchema.safeParse(req.params)
    if (!paramsResult.success) {
      invalidRequest(res, 'Invalid address format', paramsResult.error.errors)
      return
    }

    await proxyMembers(res, {
      method: 'DELETE',
      authorization,
      path: `/v1/affiliate/${paramsResult.data.address}/members/${paramsResult.data.memberAddress}`,
    })
  } catch (error) {
    console.error('Unexpected error in removeAffiliateMember:', error)
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' } satisfies ErrorResponse)
  }
}
