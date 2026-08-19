import {
  ADDRESS_FRAGMENT,
  CART_DEPS,
  IMAGE_FRAGMENT,
  MONEY_FRAGMENT,
  PRODUCT_DEPS,
  VARIANT_FRAGMENT,
} from './fragments';

export const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
      nodes {
        ...ProductSummary
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${PRODUCT_DEPS}
`;

export const COLLECTION_PRODUCTS_QUERY = /* GraphQL */ `
  query CollectionProducts(
    $handle: String!
    $first: Int!
    $after: String
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $filters: [ProductFilter!]
  ) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image {
        ...ImageFields
      }
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
        nodes {
          ...ProductSummary
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
  ${PRODUCT_DEPS}
`;

export const COLLECTION_META_QUERY = /* GraphQL */ `
  query CollectionMeta($handle: String!) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image {
        ...ImageFields
      }
    }
  }
  ${IMAGE_FRAGMENT}
`;

export const COLLECTIONS_QUERY = /* GraphQL */ `
  query Collections($first: Int!, $after: String, $query: String) {
    collections(first: $first, after: $after, query: $query) {
      nodes {
        id
        handle
        title
        description
        image {
          ...ImageFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${IMAGE_FRAGMENT}
`;

export const PRODUCT_QUERY = /* GraphQL */ `
  query ProductByHandle($handle: String!, $metafields: [HasMetafieldsIdentifier!]!) {
    product(handle: $handle) {
      ...ProductSummary
      description
      descriptionHtml
      seo {
        title
        description
      }
      images(first: 12) {
        nodes {
          ...ImageFields
        }
      }
      options {
        id
        name
        optionValues {
          id
          name
        }
      }
      variants(first: 100) {
        nodes {
          ...VariantFields
        }
      }
      metafields(identifiers: $metafields) {
        namespace
        key
        value
        type
      }
    }
  }
  ${PRODUCT_DEPS}
  ${VARIANT_FRAGMENT}
`;

export const PRODUCT_RECOMMENDATIONS_QUERY = /* GraphQL */ `
  query ProductRecommendations($productId: ID!) {
    productRecommendations(productId: $productId, intent: RELATED) {
      ...ProductSummary
    }
  }
  ${PRODUCT_DEPS}
`;

export const PRODUCTS_BY_HANDLES_QUERY = /* GraphQL */ `
  query ProductsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        ...ProductSummary
      }
    }
  }
  ${PRODUCT_DEPS}
`;

export const PREDICTIVE_SEARCH_QUERY = /* GraphQL */ `
  query PredictiveSearch($term: String!) {
    predictiveSearch(query: $term, limit: 8, types: [PRODUCT, COLLECTION, QUERY]) {
      queries {
        text
      }
      collections {
        id
        handle
        title
        description
        image {
          ...ImageFields
        }
      }
      products {
        ...ProductSummary
      }
    }
  }
  ${PRODUCT_DEPS}
`;

export const CART_QUERY = /* GraphQL */ `
  query GetCart($id: ID!) {
    cart(id: $id) {
      ...CartFields
    }
  }
  ${CART_DEPS}
`;

export const CUSTOMER_QUERY = /* GraphQL */ `
  query Customer($token: String!) {
    customer(customerAccessToken: $token) {
      id
      firstName
      lastName
      email
      phone
      acceptsMarketing
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
  ${ADDRESS_FRAGMENT}
`;

export const CUSTOMER_ORDERS_QUERY = /* GraphQL */ `
  query CustomerOrders($token: String!, $first: Int!, $after: String) {
    customer(customerAccessToken: $token) {
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          orderNumber
          name
          processedAt
          financialStatus
          fulfillmentStatus
          statusUrl
          currentTotalPrice {
            ...MoneyFields
          }
          subtotalPrice {
            ...MoneyFields
          }
          totalShippingPrice {
            ...MoneyFields
          }
          shippingAddress {
            ...AddressFields
          }
          lineItems(first: 50) {
            nodes {
              title
              quantity
              variantTitle
              originalTotalPrice {
                ...MoneyFields
              }
              variant {
                image {
                  ...ImageFields
                }
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
  ${MONEY_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${ADDRESS_FRAGMENT}
`;

export const SHOP_POLICIES_QUERY = /* GraphQL */ `
  query ShopPolicies {
    shop {
      name
      privacyPolicy {
        title
        handle
      }
      refundPolicy {
        title
        handle
      }
      shippingPolicy {
        title
        handle
      }
      termsOfService {
        title
        handle
      }
    }
  }
`;
