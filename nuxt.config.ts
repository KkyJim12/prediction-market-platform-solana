// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    databaseUrl: '',
    databaseSsl: false,
    txOddsApiOrigin: 'https://txline.txodds.com',
    txOddsApiToken: '',
    txOddsGuestJwt: '',
    solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
    predictionMarketRpcUrl: 'https://api.devnet.solana.com',
    public: {
      solanaCluster: 'mainnet-beta',
      txOddsProgramId: '9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA',
      txOddsTokenMint: 'Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL',
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
