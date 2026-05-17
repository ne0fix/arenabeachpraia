export const CONFIG = {
  WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5511999999999',
  CURRENCY: 'BRL',
  LOCALE: 'pt-BR',
} as const

export const ROUTES = {
  LOGIN: '/login',
  HOME: '/',
  BOOKING: '/booking',
  PAYMENT: '/payment',
  CONTACT: '/contact',
  PROFILE: '/profile',
  BOOKINGS: '/bookings',
  SUCCESS: '/booking-success',
  ERROR: '/booking-error',
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    BOOKINGS: '/admin/bookings',
    COURTS: '/admin/courts',
    CLIENTS: '/admin/clients',
    PAYMENTS: '/admin/financeiro',
    REPORTS: '/admin/reports',
    SETTINGS: '/admin/settings',
    HORARIOS: '/admin/horarios',
  },
} as const
