/**
 * Shared GraphQL fragments.
 *
 * `PRODUCT_SUMMARY` is intentionally lean: it is what grids and carousels
 * render, and fetching options/variants/metafields there would multiply the
 * Storefront query cost for data no card ever shows.
 */

export const IMAGE_FRAGMENT = /* GraphQL */ `
  fragment ImageFields on Image {
    url
    altText
    width
    height
  }
`;

export const MONEY_FRAGMENT = /* GraphQL */ `
  fragment MoneyFields on MoneyV2 {
    amount
    currencyCode
  }
`;

export const PRODUCT_SUMMARY_FRAGMENT = /* GraphQL */ `
  fragment ProductSummary on Product {
    id
    handle
    title
    vendor
    productType
    tags
    availableForSale
    featuredImage {
      ...ImageFields
    }
    priceRange {
      minVariantPrice {
        ...MoneyFields
      }
      maxVariantPrice {
        ...MoneyFields
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...MoneyFields
      }
      maxVariantPrice {
        ...MoneyFields
      }
    }
  }
`;

export const VARIANT_FRAGMENT = /* GraphQL */ `
  fragment VariantFields on ProductVariant {
    id
    title
    sku
    availableForSale
    quantityAvailable
    price {
      ...MoneyFields
    }
    compareAtPrice {
      ...MoneyFields
    }
    selectedOptions {
      name
      value
    }
    image {
      ...ImageFields
    }
  }
`;

export const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount {
        ...MoneyFields
      }
      totalAmount {
        ...MoneyFields
      }
      totalTaxAmount {
        ...MoneyFields
      }
      totalDutyAmount {
        ...MoneyFields
      }
    }
    discountCodes {
      code
      applicable
    }
    lines(first: 100) {
      nodes {
        id
        quantity
        cost {
          totalAmount {
            ...MoneyFields
          }
          amountPerQuantity {
            ...MoneyFields
          }
          compareAtAmountPerQuantity {
            ...MoneyFields
          }
        }
        merchandise {
          ... on ProductVariant {
            id
            title
            availableForSale
            quantityAvailable
            price {
              ...MoneyFields
            }
            compareAtPrice {
              ...MoneyFields
            }
            selectedOptions {
              name
              value
            }
            image {
              ...ImageFields
            }
            product {
              id
              handle
              title
              vendor
              featuredImage {
                ...ImageFields
              }
            }
          }
        }
      }
    }
  }
`;

export const ADDRESS_FRAGMENT = /* GraphQL */ `
  fragment AddressFields on MailingAddress {
    id
    firstName
    lastName
    address1
    address2
    city
    province
    zip
    country
    phone
  }
`;

/** Fragments every product-shaped query needs, concatenated for convenience. */
export const PRODUCT_DEPS = [IMAGE_FRAGMENT, MONEY_FRAGMENT, PRODUCT_SUMMARY_FRAGMENT].join('\n');
export const CART_DEPS = [IMAGE_FRAGMENT, MONEY_FRAGMENT, CART_FRAGMENT].join('\n');
