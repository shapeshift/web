import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

export const oneInchService = axios.create(axiosConfig)
