import axios from 'axios'

const axiosConfig = {
  baseURL: 'https://api.0x.org/',
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
}

export const zrxService = axios.create(axiosConfig)
