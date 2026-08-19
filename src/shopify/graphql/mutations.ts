import { CART_DEPS } from './fragments';

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
