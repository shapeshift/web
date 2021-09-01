import axios from 'axios'
import https from 'https'

export const axiosClient = axios.create({
  baseURL: process.env.UNCHAINED_URL,
  httpsAgent: new https.Agent({
    rejectUnauthorized: process.env.NODE_ENV === 'development' ? false : true
  })
})
