import type { Money } from '@/shopify/types';

/** Types for the Customer Account API, which differs from the Storefront API. */

export interface CustomerAddress {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  /** Province / state code, e.g. `MH`. */
  zoneCode: string | null;
  /** ISO country code, e.g. `IN`. */
  territoryCode: string | null;
  zip: string | null;
  phoneNumber: string | null;
}

export interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  defaultAddress: CustomerAddress | null;
  addresses: CustomerAddress[];
}

export interface TrackingInformation {
  number: string | null;
  company: string | null;
  url: string | null;
}

export interface OrderLineItem {
  title: string;
  quantity: number;
  variantTitle: string | null;
  totalPrice: Money;
  image: { url: string; altText: string | null } | null;
}

export interface Order {
  id: string;
  number: number;
  name: string;
  processedAt: string;
  financialStatus: string | null;
  statusPageUrl: string | null;
  totalPrice: Money;
  subtotal: Money | null;
  totalShipping: Money | null;
  shippingAddress: CustomerAddress | null;
  fulfillmentStatus: string | null;
  tracking: TrackingInformation[];
  estimatedDeliveryAt: string | null;
  lineItems: OrderLineItem[];
}

export interface AddressInput {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  zoneCode?: string;
  territoryCode?: string;
  zip?: string;
  phoneNumber?: string;
}
