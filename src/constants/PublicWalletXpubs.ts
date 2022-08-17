/**
 * use demo wallet seed from @tshifty at https://iancoleman.io/bip39/ to generate
 *
 * under "Derivation Path" section, use bip32 with a custom derivation path
 */
export const PublicWalletXpubs = [
  'xpub661MyMwAqRbcH2gnL9ViCgCpEiBmM7URHsDUGm6jLm7dhXA6ezQZfdCvoehbzn45TQC9iCcUmEFfYrpQXwJhUFYRG1RZfVyXQ8Y9Ffc13oK', // demo seed root key
  'xpub684Yh5UsSGwgDtrEoLqJxtWdRJeYnpsVvYML9RhgrLHifLrqHqsYrqTm65C2PoyBuxCuruMYDoJ3nrkrxMcRCFDHBV5MDsoD7ryYwGGHwzY', // demo seed m/44'
  'xpub6AbTXd2k7UBDcm6o9iYiZ1oGjCiE9GbDvHQnRmEMk5vV1bBEnSchSGgd2sySQQew7TtJusRq7TuTWeFkAc69ddH87cxM8bHXfq9SgQexgFH', // demo seed m/44'/0'
  'xpub6CqdGe3Jt9L1HNxgCkUSjemBoLiXUGvHQykJ6xgZXgWDHP15vQLJPV66ivRbspUsULrsFwfD431qhTzBMuUtBXx8L6VpK5ECaroyzNvddES', // demo seed m/44'/0'/0'
  'dgub8q7H7P5LeZYdu3bsuQbjFyxHVNLgCenTypQwCdUKvhJMg6NoKK6aUZUM7G7oidvYyXPbsWbb9WWTgZLVf1jgmaYKBE77qApCmdXqTtnJ7DX', // demo seed m/44'/3'
  'xpub6AbTXd2k7UBKxtDYCt3Hw962WpGKHebzMk4DvaXn2TdiLs4PwgLwTpMKaGqr11ChNiUkxbvcftQEayPt9s4nGcinzwCuhJHqyPoFukp2Gba', // demo seed m/44'/145'    BCH
  'xpub6CNfjXxiDDT9s8MZT3rWxhboqXNr6CseFRWh9DpgnKQK9n2j9kDLbeWuFbnbQp5Etvg4BszAorUkdRLe75J1YH5xqzHExXNUtYFYNBBZjrV', // demo seed m/44'/145'/0'
  'Ltub2X2ZzGEmzuVDvyR4Yxbji5HKJJDXvEx1jhpXDEj65xkW67zs4F9rPs248VsP6UpU9m23vAxPkZNCW3sXiDGeivs8nKovkxqpkNdXavgWBaM', // demo seed m/44'/2'      LTC
  'Ltub2YRbEesEiQFya2jAqSiqL4pdLXYtG1sHuY34rbPYnSSNBVyVcbdBRVWLUAoDZ5kMwUH3pctUf2oniLCu52c3xqXs4NqeeJ6KndA7VeuE8of', // demo seed m/44'/2'/0'
  'dgub8sRkD1szAxkru3oo3fhoXNjvaKDLagf2VvTw58ngHQK8jiSJ7d9gYpT2MU6fyHtBDsbUzSXTkv7UXaTZJiZeUijuc3MUXbfrCJMXW58CUwf', // demo seed m/44'/3'/0'
  'xpub6AbTXd2k7UBGDLSazXMo4vVY18W8iW8PXMz4tFnu9if2FN7pTvTrNujEfikeZZDtjLrPNKkB9TR8igUgkgLQ8PVPgUgpf1DRMMaVFa6ruXq', // demo seed m/44'/60'
  'xpub6CAWCBLnE7AFtoAcfjcms1M636qotvdaaDHb75kwGAduwV7rQe7qFzCLZyefLJPchro2ejuuJjPQNhyBvcgKzFzfnVTeoqxA83LmoWfreNT', // demo seed m/44'/60'/0'
  'xpub6AbTXd2k7UBJc7h4j7bLqfcoEDGXu7FqzXVyFPJyti8kCmKPWfNFsyGVX5qwvGdNYxdLBL5WwvDp85qBYC65cT1VNyc7gR94GT2DgPTSXCx', // demo seed m/44'/114'
  'xpub6CcxBycxQLzYGdCUrhMhXToSpaRJAv6m8fpj6dpFcwnWvYUyNvghrSAAqezmcnSxokHwekpjgP55YptpVjjmQGDBNy2sVrgSqhGu8ePFPgE', // demo seed m/44'/114'/0'
  'xpub6AbTXd2k7UBJn6FjYYLBQR6JeSkQDLFQcRdnrtALoNwuq8uJ6YPPoMPSGkLjkkHuRZywePjDJX5SsBbnYEkKFpWPLraSQSyaFaLLPhYHRTk', // demo seed m/44'/118'
  'xpub6DEAWXE3ezPftH8Zvn4h55LqsmLTGMt9UoiNAdW8hCCSpZWL8DrDknD6B7B8FPoyYXdu2oDV84DihEbbW3BvzN4ibAc8494FWGRfgKeQdnL', // demo seed m/44'/118'/0'
  'xpub6AbTXd2k7UBN7Z9GxK9jNfswCgoaMhFGANCJsrYUHhWGkBj2PwF9wuR11kr2L1voWPwFtprqpngPXpNdX9fTQLfe9W1Ue8qy5LjwnK33Ttg', // demo seed m/44'/194'
  'xpub6D7pDfML43HfR7ipWQywCThBrP1LWJZPat2mJEwJ39ucr1Y3c9ptLAjyhJu8qNa89ETagWagxevNxEVTN6GwZg8ftwMuhZkBCJ6EyTUAL2E', // demo seed m/44'/194'/0'
  'xpub6AbTXd2k7UBPuZcRY1SQ7hDkZsUVZVFnUZUE9pr8HnA42jzJvfYJWFrfWCKpZSiNPfsPfyd52CJNbSADYoH97iwWYUqoNVN3JCPaTSAU1iD', // demo seed m/44'/235'
  'xpub6CqDCnfUvEDp24k51JNFvSSQhA7R8kLBQ8bu1jZTML75Pi1geysC2PGKXPvK2b9D36sAq9U8bdGjzpjuXFn2NJZLuq5BGLWuXdSMuL4urai', // demo seed m/44'/235'/0'
  'xpub6AbTXd2k7UBU7QMFxKLf3TV63cJCKKZgoytLLzrfG6KzZejNjfkzoyEJHnEUdLMstM2VpBFiQJjpCtEEc9RwiFHkWpx92rVKi1wHB26NJ1u', // demo seed m/44'/330'
  'xpub6ByW1V1gui5bwrpp76EYvo37ipQRKwc52mTxRQdsBuzDMEqdUJ3A5CuiNrFAtHjUciYdFiVTr3xfQGBGczZR4HCnEYeYPZHu16o2JxyZytj', // demo seed m/44'/330'/0'
  'xpub6AbTXd2k7UBZkVh7UM2JQyvQygJpuweFTztdiKKYrYRDbKZFvog5MKd6xFYFRyULoyEBZVBPxWgEJbF1LUVWhMVmfpUN79T7yMTUQPE6a7w', // demo seed m/44'/459'
  'xpub6C1GXKvypMSzXyzshy8rVg1Lt4JomAbQ3rNnuti4QvJ3tK6ZZj5peswkxfgVGWzRVKdXeN2ZD6wPcVgNbM5Zodq5pbsTKu6Tmcvb6Nt4Fr5', // demo seed m/44'/459'/0'
  'xpub6AbTXd2k7UBcrYGnnPm5pdJzjjfjggwzThNk9zwq49Jqm4nBLxhnmP1wr8bTF6oXtnt1EhTmJUkHTS67ErS8TF3MjPKeJ7yxi7TmXgAEsqy', // demo seed m/44'/529'
  'xpub6Ch2P41arz3HWQWPUXtdUPazuYcBwZWDD3svkqV21J2ESbdReMH2WdTgEQNGMtk9eimAfKJVXNXAW1b7YiUK3Y46mn5BSuNPmvwZye287ST', // demo seed m/44'/529'/0'
  'xpub6AbTXd2k7UBkxuN7iMmVXK22nRZn18urvZkmcc6MBymSa9ZRUNvjebBFDcuMQRUeEFcS74LRvhkbeQ9uTLrFBJS47KZADPUWMu5zPk5kaKd', // demo seed m/44'/714'
  'xpub6DELY1ZiQtp8NwFheaFU82kLymp7fZ9Hao4ZA49z8Ywb57zVixM9gqamttdAfBH4Dny17gDVGuAVrv95kc1bUovxbZ1aj6hqGNvkfYb6Dh9', // demo seed m/44'/714'/0'
  'xpub6AbTXd2k7UBvVkY3DrcjuBoBKhqTaJXhQvWPpAY8dQBLC3WM7dLDmajNvjkBafQ1NkB2pWVUCQf5u8KndZsqsRR3MK4DadRi9bfXbCDpsXN', // demo seed m/44'/931'
  'xpub6BqmqiBhP7nFjU4owuR3WZbytsTyUuCLb4by7Pb9MmTtBFKQNWPzJE5g19cZXnJQP1ankKSWR3Jopbcv8w1mL9wPW8wfxe1NPobsKa8gWyg', // demo seed m/44'/931'/0'
  'xpub684Yh5UsSGwgUnc8AK4oW8fxHk2kZwTFRxJzBcjkBwrVWfz9o3H8ea1QybTFVx5vsEQ9unAe7BGyF88B7cX5cPNnuPt3N67BwZwcevaRgTA', // demo seed m/49'
  'xpub6AZXdxfsqHn5H6LQvBxccTJ5r9QgStDQdzWFNhQ2hqmFRJ1sQNqYadpBW5kAbKafyctiQMjwvGecj2LcM4G2JL5uK1uuHa8RsYzTtuo1d2C', // demo seed m/49'/0'
  'xpub6DWMWccyXpfe5FNxzoG97qMQU8Aq49aF3ZBgHesxxMP5r4aNtNwYwzf3zcK5mr6ctb3TWArU8nnohrAzzq2AU8JUdtaZn62CxkMWp1qU81U', // demo seed m/49'/0'/0'
  'Ltub2Wze6bsuij65baGDug4kPo2mLucLKFFeJ71qQbmSkC2i67MTo4KhyirwTXgSaPaVYE3SKqWXppxJ4Vca8Smhohh3dGWJ8JVBXFpx6ykw6GJ', // demo seed m/49'/2'    LTC
  'Ltub2YTMx9wboXVKD198go3yHY6NmBsHYoerquZgTxFFvYTZ5QZhvazgKXKLDE4K5XuU8fZW4XkPtpGzBormPsoc7FP5bMEcwufseQx5QwWgAaA', // demo seed m/49'/2'/0'
  'xpub684Yh5UsSGwhygS4yN3MGaCZwCMV9ySKfKuyWEXwP2bJXAVVFStNRWcmHQ4y5WGygPs5g1235K6RUFwTdJpudiAoPpZ47MB4vnfonCHU4HE', // demo seed m/84'
  'xpub6B94qLDcHdP2oDupbSfrab4T17WfGTg2uBrfQ2CZwAqXUE9Yu3LuBjXCpFNZYCYkv6tagKVSNsfdJwbJuA3afL5zCD8dNKTWrYBLpH2G8t8', // demo seed m/84'/0'
  'xpub6DUX2TRPEj9PtfTsTvHY5phz4tMBL9kWSae98V72FaEwatQVU88vXveYZmFwJLjMhvFTXghhVAymSG2vCbaWm8ky7WurHaN59wiVvPaATDz', // demo seed m/84'/0'/0'
  'Ltub2XaBHyReB4h3AMi851LDSeivFzLw4dx9Wns18jbFWoNBsXVx6ePeGknvqVzMjibJBZ5DBwGV77pXVWEzETwyVrru8fam72jnE7LDuVrHVdD', // demo seed m/84'/2'    LTC
  'Ltub2Zt5KL32tkFAqQ9PvUMY5hcaMQTfnvESWmvdZ9d21LxTkTJxDSX8qHhot84fR6VZYPY9LikAA1xm6qVFNy56wg4a8HpG9TvKQVf9wMsiT2U', // demo seed m/84'/2/0'
].join(' ')
