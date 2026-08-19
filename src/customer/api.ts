import type { Money } from '@/shopify/types';
import { assertNoUserErrors, customerRequest, type CustomerUserError } from './client';
import {
  ADDRESS_CREATE_MUTATION,
  ADDRESS_DELETE_MUTATION,
  ADDRESS_UPDATE_MUTATION,
  CUSTOMER_ORDERS_QUERY,
  CUSTOMER_PROFILE_QUERY,
  CUSTOMER_UPDATE_MUTATION,
} from './graphql';
import type { AddressInput, Customer, CustomerAddress, Order, TrackingInformation } from './types';

/** Typed operations against the Customer Account API. */

interface RawCustomer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  emailAddress: { emailAddress: string | null } | null;
  phoneNumber: { phoneNumber: string | null } | null;
  defaultAddress: CustomerAddress | null;
  addresses: { nodes: CustomerAddress[] };
}

function normaliseCustomer(raw: RawCustomer): Customer {
  return {
    id: raw.id,
    firstName: raw.firstName,
    lastName: raw.lastName,
    displayName: raw.displayName,
    // Both are wrapper objects on this API, not plain strings.
    email: raw.emailAddress?.emailAddress ?? null,
    phone: raw.phoneNumber?.phoneNumber ?? null,
    defaultAddress: raw.defaultAddress,
    addresses: raw.addresses.nodes,
  };
}

export async function fetchCustomer(accessToken: string): Promise<Customer | null> {
  const data = await customerRequest<{ customer: RawCustomer | null }>(
    CUSTOMER_PROFILE_QUERY,
    {},
    accessToken,
  );
  return data.customer ? normaliseCustomer(data.customer) : null;
}

interface RawOrder {
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
  fulfillments: {
    nodes: {
      status: string | null;
      estimatedDeliveryAt: string | null;
      trackingInformation: TrackingInformation[];
    }[];
  };
  lineItems: { nodes: Order['lineItems'] };
}

function normaliseOrder(raw: RawOrder): Order {
  const fulfillments = raw.fulfillments.nodes;
  return {
    id: raw.id,
    number: raw.number,
    name: raw.name,
    processedAt: raw.processedAt,
    financialStatus: raw.financialStatus,
    statusPageUrl: raw.statusPageUrl,
    totalPrice: raw.totalPrice,
    subtotal: raw.subtotal,
    totalShipping: raw.totalShipping,
    shippingAddress: raw.shippingAddress,
    // An order can ship in several parcels. The first fulfilment's status is
    // the honest headline; per-parcel tracking is flattened below it.
    fulfillmentStatus: fulfillments[0]?.status ?? null,
    estimatedDeliveryAt: fulfillments.find((f) => f.estimatedDeliveryAt)?.estimatedDeliveryAt ?? null,
    tracking: fulfillments.flatMap((f) => f.trackingInformation ?? []),
    lineItems: raw.lineItems.nodes,
  };
}

export async function fetchOrders(args: {
  accessToken: string;
  first?: number;
  after?: string | null;
}): Promise<{ items: Order[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }> {
  const data = await customerRequest<{
    customer: {
      orders: { nodes: RawOrder[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
    } | null;
  }>(CUSTOMER_ORDERS_QUERY, { first: args.first ?? 15, after: args.after ?? null }, args.accessToken);

  const orders = data.customer?.orders;
  if (!orders) return { items: [], pageInfo: { hasNextPage: false, endCursor: null } };
  return { items: orders.nodes.map(normaliseOrder), pageInfo: orders.pageInfo };
}

export async function updateCustomer(
  accessToken: string,
  input: { firstName?: string; lastName?: string },
): Promise<void> {
  const data = await customerRequest<{ customerUpdate: { userErrors: CustomerUserError[] } }>(
    CUSTOMER_UPDATE_MUTATION,
    { input },
    accessToken,
  );
  assertNoUserErrors(data.customerUpdate.userErrors);
}

export async function createAddress(
  accessToken: string,
  address: AddressInput,
  makeDefault = false,
): Promise<CustomerAddress> {
  const data = await customerRequest<{
    customerAddressCreate: { customerAddress: CustomerAddress | null; userErrors: CustomerUserError[] };
  }>(ADDRESS_CREATE_MUTATION, { address, defaultAddress: makeDefault }, accessToken);

  assertNoUserErrors(data.customerAddressCreate.userErrors);
  const created = data.customerAddressCreate.customerAddress;
  if (!created) throw new Error('Could not save that address.');
  return created;
}

export async function updateAddress(
  accessToken: string,
  addressId: string,
  address: AddressInput,
  makeDefault?: boolean,
): Promise<CustomerAddress> {
  const data = await customerRequest<{
    customerAddressUpdate: { customerAddress: CustomerAddress | null; userErrors: CustomerUserError[] };
  }>(ADDRESS_UPDATE_MUTATION, { addressId, address, defaultAddress: makeDefault ?? null }, accessToken);

  assertNoUserErrors(data.customerAddressUpdate.userErrors);
  const updated = data.customerAddressUpdate.customerAddress;
  if (!updated) throw new Error('Could not update that address.');
  return updated;
}

export async function deleteAddress(accessToken: string, addressId: string): Promise<void> {
  const data = await customerRequest<{
    customerAddressDelete: { userErrors: CustomerUserError[] };
  }>(ADDRESS_DELETE_MUTATION, { addressId }, accessToken);
  assertNoUserErrors(data.customerAddressDelete.userErrors);
}

/** Marks an existing address as the default without otherwise changing it. */
export async function setDefaultAddress(accessToken: string, address: CustomerAddress): Promise<void> {
  await updateAddress(
    accessToken,
    address.id,
    {
      firstName: address.firstName ?? undefined,
      lastName: address.lastName ?? undefined,
      company: address.company ?? undefined,
      address1: address.address1 ?? undefined,
      address2: address.address2 ?? undefined,
      city: address.city ?? undefined,
      zoneCode: address.zoneCode ?? undefined,
      territoryCode: address.territoryCode ?? undefined,
      zip: address.zip ?? undefined,
      phoneNumber: address.phoneNumber ?? undefined,
    },
    true,
  );
}
