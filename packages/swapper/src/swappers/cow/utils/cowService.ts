import axios from 'axios'

const axiosConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
}

export const cowService = axios.create(axiosConfig)
