export const REFERRAL_BONUS_REFERRER = 20;
export const REFERRAL_BONUS_REFERRED = 20;
export const REFERRAL_MONTHLY_CAP = 200;
export const LOYALTY_POINTS_PER_PESO = 1;
export const LOYALTY_EXPIRATION_DAYS = 90;
export const LOYALTY_REDEMPTIONS = {
  100: { type: 'discount', value: 10 } as const,
  250: { type: 'discount', value: 30 } as const,
  500: {
    type: 'free_bottle',
    liters: 20,
    waterTypeName: 'Purificada',
  } as const,
  1000: { type: 'free_bottle', liters: 20, waterTypeName: 'Alcalina' } as const,
} as const;
export const ORDER_ACCEPT_TIMEOUT_MIN = 30;
export const CHAT_VISIBILITY_HOURS = 24;
export const SUGGESTED_TIPS = [5, 10, 20];
export const VERIFICATION_CODE_LENGTH = 6;
export const VERIFICATION_CODE_TTL_MIN = 15;
export const DEFAULT_SEARCH_RADIUS_KM = 5;
