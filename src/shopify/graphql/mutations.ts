import { ADDRESS_FRAGMENT, CART_DEPS } from './fragments';

const USER_ERRORS = /* GraphQL */ `
  userErrors {
    field
    message
  }
`;

export const CART_CREATE_MUTATION = /* GraphQL */ `
  mutation CartCreate($lines: [CartLineInput!], $buyerIdentity: CartBuyerIdentityInput) {
    cartCreate(input: { lines: $lines, buyerIdentity: $buyerIdentity }) {
      cart {
        ...CartFields
      }
      ${USER_ERRORS}
    }
  }
  ${CART_DEPS}
`;

export const CART_LINES_ADD_MUTATION = /* GraphQL */ `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      ${USER_ERRORS}
    }
  }
  ${CART_DEPS}
`;

export const CART_LINES_UPDATE_MUTATION = /* GraphQL */ `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      ${USER_ERRORS}
    }
  }
  ${CART_DEPS}
`;

export const CART_LINES_REMOVE_MUTATION = /* GraphQL */ `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFields
      }
      ${USER_ERRORS}
    }
  }
  ${CART_DEPS}
`;

export const CART_DISCOUNT_CODES_UPDATE_MUTATION = /* GraphQL */ `
  mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...CartFields
      }
      ${USER_ERRORS}
    }
  }
  ${CART_DEPS}
`;

/**
 * Attaching the customer access token to the cart is what makes Shopify's
 * hosted checkout open already signed in, so the buyer does not re-enter an
 * address the app already knows.
 */
export const CART_BUYER_IDENTITY_UPDATE_MUTATION = /* GraphQL */ `
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        ...CartFields
      }
      ${USER_ERRORS}
    }
  }
  ${CART_DEPS}
`;

/**
 * NOTE: every `customerAccessToken*` and `customer*` mutation below belongs to
 * the LEGACY customer-account flow, which Shopify serves only for stores on
 * classic customer accounts.
 *
 * ownlyclub.in runs NEW_CUSTOMER_ACCOUNTS, so these will fail against it until
 * the app is migrated to the OAuth-based Customer Account API. See the
 * "Customer accounts" section of the README. Catalogue, cart and checkout are
 * unaffected — none of them need a customer session.
 */
export const CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION = /* GraphQL */ `
  mutation CustomerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;

export const CUSTOMER_ACCESS_TOKEN_RENEW_MUTATION = /* GraphQL */ `
  mutation CustomerAccessTokenRenew($token: String!) {
    customerAccessTokenRenew(customerAccessToken: $token) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CUSTOMER_ACCESS_TOKEN_DELETE_MUTATION = /* GraphQL */ `
  mutation CustomerAccessTokenDelete($token: String!) {
    customerAccessTokenDelete(customerAccessToken: $token) {
      deletedAccessToken
      userErrors {
        field
        message
      }
    }
  }
`;

export const CUSTOMER_CREATE_MUTATION = /* GraphQL */ `
  mutation CustomerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;

export const CUSTOMER_RECOVER_MUTATION = /* GraphQL */ `
  mutation CustomerRecover($email: String!) {
    customerRecover(email: $email) {
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;

export const CUSTOMER_UPDATE_MUTATION = /* GraphQL */ `
  mutation CustomerUpdate($token: String!, $customer: CustomerUpdateInput!) {
    customerUpdate(customerAccessToken: $token, customer: $customer) {
      customer {
        id
        firstName
        lastName
        email
        phone
        acceptsMarketing
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;

export const CUSTOMER_ADDRESS_CREATE_MUTATION = /* GraphQL */ `
  mutation CustomerAddressCreate($token: String!, $address: MailingAddressInput!) {
    customerAddressCreate(customerAccessToken: $token, address: $address) {
      customerAddress {
        ...AddressFields
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
  ${ADDRESS_FRAGMENT}
`;

export const CUSTOMER_ADDRESS_UPDATE_MUTATION = /* GraphQL */ `
  mutation CustomerAddressUpdate($token: String!, $id: ID!, $address: MailingAddressInput!) {
    customerAddressUpdate(customerAccessToken: $token, id: $id, address: $address) {
      customerAddress {
        ...AddressFields
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
  ${ADDRESS_FRAGMENT}
`;

export const CUSTOMER_ADDRESS_DELETE_MUTATION = /* GraphQL */ `
  mutation CustomerAddressDelete($token: String!, $id: ID!) {
    customerAddressDelete(customerAccessToken: $token, id: $id) {
      deletedCustomerAddressId
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;

export const CUSTOMER_DEFAULT_ADDRESS_UPDATE_MUTATION = /* GraphQL */ `
  mutation CustomerDefaultAddressUpdate($token: String!, $addressId: ID!) {
    customerDefaultAddressUpdate(customerAccessToken: $token, addressId: $addressId) {
      customer {
        id
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;
