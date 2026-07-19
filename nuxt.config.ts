// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    databaseUrl: '',
    databaseSsl: false,
    txOddsApiOrigin: 'https://txline-dev.txodds.com',
    txOddsApiToken: 'txoracle_api_15caf7452fd34fa4a796ad7691814d1f',
    txOddsGuestJwt: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJleHAiOjE3ODcwMjg0MTksInNlc3Npb25JZCI6IjI0YzFmMTNmLTEzYjQtNDRkYS1iMmM2LWM5ZDVlNWYyOTY4NCIsInJvbGUiOiJndWVzdCIsIm1heWJlQ2xpZW50SXAiOiIzLjE3Mi45Ny4xMDIifQ.mVP4rO0S9CSOvqk6ssUdxjC-vOpweZhOTC79tjr432MOEaIn1Q4kIdL2pFlGTNxS0cTC2HOaUdKXu1jJGRmuEA',
    solanaRpcUrl: 'https://api.devnet.solana.com',
    predictionMarketRpcUrl: 'https://api.devnet.solana.com',
    public: {
      solanaCluster: 'devnet',
      txOddsProgramId: '6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J',
      txOddsTokenMint: '4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG',
      predictionMarketCluster: 'devnet',
      predictionMarketProgramId: 'FqRv1nR9E2TRQp1LXZmjp98kdWLLYDcLPD5GyUCb8dV4'
    }
  },

  modules: [
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/fonts',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    'dayjs-nuxt',
    'nuxt-toast'
  ],

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: ''
  },

  app: {
    head: {
      title: 'Purplex - The Best Rate AMM Prediction Market',
      meta: [
        { name: 'description', content: 'The Best Rate AMM Prediction Market' },
        { name: 'theme-color', content: '#0b0712' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' }
      ]
    }
  }
})
