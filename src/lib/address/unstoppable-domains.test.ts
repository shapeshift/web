import { parseUnstoppableDomainsResult, UnstoppableDomainsData } from './unstoppable-domains'

describe('parseUnstoppableDomainsResult', () => {
  const data: UnstoppableDomainsData = {
    records: {
      'ipfs.html.value': 'QmTiqc12wo2pBsGa9XsbpavkhrjFiyuSWsKyffvZqVGtut',
      'crypto.ADA.address':
        'DdzFFzCqrhsuwQKiR3CdQ1FzuPAydtVCBFTRdy9FPKepAHEoXCee2qrio975M4cEbqYwZBsWJTNyrJ8NLJmAReSwAakQEHWBEd2HvSS7',
      'crypto.BTC.address': 'bc1q359khn0phg58xgezyqsuuaha28zkwx047c0c3y',
      'crypto.ETH.address': '0x8aaD44321A86b170879d7A244c1e8d360c99DdA8',
      'gundb.username.value':
        '0x8912623832e174f2eb1f59cc3b587444d619376ad5bf10070e937e0dc22b9ffb2e3ae059e6ebf729f87746b2f71e5d88ec99c1fb3c7c49b8617e2520d474c48e1c',
      'social.picture.value': '1/erc1155:0xc7e5e9434f4a71e6db978bd65b4d61d3593e5f27/14317',
      'gundb.public_key.value':
        'pqeBHabDQdCHhbdivgNEc74QO-x8CPGXq4PKWgfIzhY.7WJR5cZFuSyh1bFwx0GWzjmrim0T5Y6Bp0SSK0im3nI',
      'ipfs.redirect_domain.value':
        'https://abbfe6z95qov3d40hf6j30g7auo7afhp.mypinata.cloud/ipfs/Qme54oEzRkgooJbCDr78vzKAWcv6DDEZqRhhDyDtzgrZP6',
    },
    meta: {
      domain: 'brad.crypto',
      blockchain: 'ETH',
      networkId: 1,
      owner: '0x8aad44321a86b170879d7a244c1e8d360c99dda8',
      resolver: '0xb66dce2da6afaaa98f2013446dbcb0f4b0ab2842',
      registry: '0xD1E5b0FF1287aA9f9A268759062E4Ab08b9Dacbe',
    },
  }
  it('should return an object with addresses by chainId', () => {
    const result = parseUnstoppableDomainsResult(data)
    const expected = {
      'bip122:000000000019d6689c085ae165831e93': 'bc1q359khn0phg58xgezyqsuuaha28zkwx047c0c3y',
      'eip155:1': '0x8aad44321a86b170879d7a244c1e8d360c99dda8',
    }
    expect(result).toEqual(expected)
  })
})
