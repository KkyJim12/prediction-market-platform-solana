// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

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
      title: 'Contraria — Solana prediction markets',
      meta: [
        { name: 'description', content: 'Create, trade, and earn on community-owned prediction markets on Solana.' },
        { name: 'theme-color', content: '#0d0b0c' }
      ]
    }
  }
})
