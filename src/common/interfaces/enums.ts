export enum Role {
  CONSUMER = 'consumer',
  PURIFIER = 'purifier',
  DELIVERY = 'delivery',
  ADMIN = 'admin',
}
export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_TRANSIT = 'in_transit',
  EMPTY_PICKUP = 'empty_pickup',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}
export enum OrderMode {
  OPEN = 'open',
  TO_PURIFIER = 'to_purifier',
  TO_DELIVERY = 'to_delivery',
}
export enum PaymentMethod {
  CASH = 'cash',
  WALLET = 'wallet',
}
export enum StoreSalePaymentMethod {
  CASH = 'cash',
  WALLET = 'wallet',
  TRANSFER = 'transfer',
}
export enum TransactionType {
  DEPOSIT = 'deposit',
  PAYMENT = 'payment',
  EARNING = 'earning',
  COMMISSION = 'commission',
  WITHDRAWAL = 'withdrawal',
  REFERRAL_BONUS = 'referral_bonus',
  POINTS_REDEMPTION = 'points_redemption',
  REFUND = 'refund',
}
export enum SubscriptionFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}
export enum CouponType {
  AMOUNT = 'amount',
  PERCENTAGE = 'percentage',
  TWO_FOR_ONE = 'two_for_one',
  FREE_DELIVERY = 'free_delivery',
}
export enum KycStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
}
export enum Shift {
  MORNING = 'morning',
  EVENING = 'evening',
  FULL = 'full',
}
export enum ChatMessageType {
  TEXT = 'text',
  LOCATION = 'location',
  PHOTO = 'photo',
}
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}
export enum CommissionType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
  DISABLED = 'disabled',
}
export enum LoyaltyEntryType {
  EARN = 'earn',
  REDEEM = 'redeem',
  EXPIRE = 'expire',
  BONUS = 'bonus',
}
export enum InventoryMovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
}
export enum CashEntryType {
  INCOME = 'income',
  EXPENSE = 'expense',
}
