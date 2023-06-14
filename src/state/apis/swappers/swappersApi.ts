import { createApi } from '@reduxjs/toolkit/dist/query/react'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'

export const swappersApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swappersApi',
  endpoints: _build => ({}),
})
