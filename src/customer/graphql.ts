/**
 * Customer Account API documents.
 *
 * Every one of these was validated against Shopify's published Customer
 * Account API schema before being written here — the field names differ from
 * the Storefront API in ways that are easy to get wrong (`emailAddress` is an
 * object, orders expose `number` not `orderNumber`, money fields are `amount`
 * on a differently-named wrapper).
 */

const ADDRESS_FIELDS = /* GraphQL */ `
  fragment AddressFields on CustomerAddress {
    id
    firstName
    lastName
    company
    address1
    address2
    city
    zoneCode
    territoryCode
    zip
    phoneNumber
  }
`;

export const CUSTOMER_PROFILE_QUERY = /* GraphQL */ `
  query CustomerProfile {
    customer {
      id
      firstName
      lastName
      displayName
      emailAddress {
        emailAddress
      }
      phoneNumber {
        phoneNumber
      }
      defaultAddress {
        ...AddressFields
      }
      addresses(first: 20) {
        nodes {
          ...AddressFields
        }
      }
    }
  }
  ${ADDRESS_FIELDS}
`;

export const CUSTOMER_ORDERS_QUERY = /* GraphQL */ `
  query CustomerOrders($first: Int!, $after: String) {
    customer {
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          number
          name
          processedAt
          financialStatus
          statusPageUrl
          totalPrice {
            amount
            currencyCode
          }
          subtotal {
            amount
            currencyCode
          }
          totalShipping {
            amount
            currencyCode
          }
          shippingAddress {
            ...AddressFields
          }
          fulfillments(first: 10) {
            nodes {
              status
              estimatedDeliveryAt
              trackingInformation {
                number
                company
                url
              }
            }
          }
          lineItems(first: 50) {
            nodes {
              title
              quantity
              variantTitle
              totalPrice {
                amount
                currencyCode
              }
              image {
                url
                altText
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
  ${ADDRESS_FIELDS}
`;

export const CUSTOMER_UPDATE_MUTATION = /* GraphQL */ `
  mutation CustomerUpdate($input: CustomerUpdateInput!) {
    customerUpdate(input: $input) {
      customer {
        id
        firstName
        lastName
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const ADDRESS_CREATE_MUTATION = /* GraphQL */ `
  mutation AddressCreate($address: CustomerAddressInput!, $defaultAddress: Boolean) {
    customerAddressCreate(address: $address, defaultAddress: $defaultAddress) {
      customerAddress {
        ...AddressFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
  ${ADDRESS_FIELDS}
`;

export const ADDRESS_UPDATE_MUTATION = /* GraphQL */ `
  mutation AddressUpdate($addressId: ID!, $address: CustomerAddressInput!, $defaultAddress: Boolean) {
    customerAddressUpdate(addressId: $addressId, address: $address, defaultAddress: $defaultAddress) {
      customerAddress {
        ...AddressFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
  ${ADDRESS_FIELDS}
`;

export const ADDRESS_DELETE_MUTATION = /* GraphQL */ `
  mutation AddressDelete($addressId: ID!) {
    customerAddressDelete(addressId: $addressId) {
      deletedAddressId
      userErrors {
        field
        message
        code
      }
    }
  }
`;
