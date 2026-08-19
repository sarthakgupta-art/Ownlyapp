# Ownly Club — mobile app

The Ownly Club storefront (ownlyclub.in) as a native iOS and Android app, built
with Expo and React Native against the Shopify Storefront API.

Browsing, search, filtering, the bag, accounts and order history are native.
Payment hands off to Shopify's hosted checkout, which keeps the existing
Shiprocket flow, payment methods and discount rules exactly as they are on the
web store.

---

## Built to outgrow fragrance

Fragrance is the first vertical, not the only one. Watches, handbags and fashion
are already defined in the registry and switched off; nothing about them lives
in a screen.

Everything that differs between verticals is **data** in
[`src/catalog/departments.ts`](src/catalog/departments.ts):

| What differs | Where it lives |
| --- | --- |
| Which products belong to the vertical | `scope` |
| What the product page's Details table shows | `attributes[].inSpecs` |
| What the filter sheet offers | `attributes[].inFilters` |
| What the home screen merchandises | `rails` |
| What the discovery quiz asks | `finder` |

### Turning on a new vertical

Watches and handbags are configured and disabled. The store already carries
stock for both — 10 watches, 10 bags and wallets — so enabling one is a
single-line change:

```ts
const watches: Department = {
  id: 'watches',
  enabled: true,   // ← was false
  ...
};
```

The shop tab, home screen, filters, product specs and the finder all pick it up.
No screen file changes.

### Adding a vertical that does not exist yet

1. Append a `Department` object to the registry.
2. Point `scope` at the Shopify product types or tags that identify it.
   **Verify the product types exist first** — Shopify silently ignores an
   unknown value and returns the whole catalogue rather than nothing:
   ```graphql
   { shop { productTypes(first: 60) { edges { node } } } }
   ```
3. List the `attributes` its product pages should show and filter on.
4. Optionally give it `rails` and a `finder` quiz.

`src/__tests__/departments.test.ts` guards the registry against the failure
modes that are otherwise invisible — an empty scope, duplicate ids, a finder
step with no options.

### How attributes are read

An attribute declares an ordered list of `sources`, and the first one that
yields a value wins:

```ts
{
  key: 'concentration',
  label: 'Concentration',
  sources: [
    { kind: 'metafield', namespace: 'custom', key: 'concentration' },
    { kind: 'tagPrefix', prefix: 'concentration:' },   // fallback
  ],
}
```

That matters for a catalogue this size: the store can keep using tags today and
move to metafields later by reordering one array, with no code change and no
migration window where product pages look empty.

---

## Getting started

```bash
npm install
cp .env.example .env      # then fill in the Storefront token
npx expo start
```

Without credentials the app shows a setup screen with the exact steps, rather
than a wall of network errors.

### Getting a Storefront token

Shopify admin → **Settings → Apps and sales channels → Develop apps → Create an
app → Configure Storefront API scopes → Install → copy the Storefront API access
token**.

Required scopes:

```
unauthenticated_read_product_listings
unauthenticated_read_product_inventory
unauthenticated_write_checkouts
unauthenticated_read_checkouts
unauthenticated_write_customers
unauthenticated_read_customers
unauthenticated_read_content
```

The Storefront token is designed to be public and is safe in the bundle. The
**Admin** API token is not, and must never appear in `.env` or anywhere else in
this repo.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Start the dev server |
| `npm run ios` / `npm run android` | Open on a simulator or device |
| `npm test` | Run the unit tests |
| `npm run typecheck` | TypeScript, including unused-symbol checks |
| `npm run lint` | ESLint + typecheck |
| `npm run check` | Lint, typecheck and test — run this before committing |
| `npm run push:serve` | Start the push registration server |
| `npm run push:stats` | Show push opt-in counts |

---

## Architecture

```
app/                      Screens (expo-router, file-based)
  (tabs)/                 Home · Shop · Finder · Saved · Bag · Account
  product/[handle]        Product detail
  collection/[handle]     Brand and collection listings
  checkout.tsx            Shopify hosted checkout in a WebView
src/
  catalog/                Department registry, attributes, query builder
  finder/                 Discovery quiz engine (department-agnostic)
  shopify/                Storefront client, GraphQL documents, typed API
  store/                  Zustand stores: cart, auth, wishlist, preferences
  hooks/                  React Query bindings
  components/             UI library
  theme/                  Design tokens
server/                   Expo push registration + campaign sender
```

### Where state lives

| State | Where | Why |
| --- | --- | --- |
| Cart | Shopify, id in AsyncStorage | Totals, tax and discounts stay authoritative, and the `checkoutUrl` handed to the WebView is the cart the buyer just built |
| Session token | Keychain / Keystore | It is a bearer credential |
| Wishlist | Product ids in AsyncStorage | Prices and stock re-read from Shopify on every visit, so a saved item never shows a stale price |
| Catalogue | React Query cache | Paginated, deduped, refetched on pull |

### Filtering, and its one honest limitation

Filters backed by `vendor`, `product_type` or a tag compile into the Storefront
search query. Filters backed by a **metafield or a variant option cannot be
searched server-side at all** — Shopify does not support it — so those are
applied to each fetched page in `narrowClientSide`.

Two consequences, both deliberate:

- A filtered page can come back shorter than the page size. Pagination
  therefore continues on the raw cursor, not the narrowed count.
- Price and in-stock bounds are re-applied locally even though they are also
  sent to Shopify. That is a no-op when the server honours them, and a safety
  net when it does not — a silently dropped price filter is otherwise invisible
  to the buyer.

A product with **no** value for a filtered attribute is never excluded. The
store's tagging is uneven, and hiding untagged stock would hide most of it.

### The finder ranks, it does not filter

Six questions ANDed together against an unevenly-tagged catalogue reliably
return nothing, which is a far worse result than an imperfectly ordered list.
So the quiz hard-filters only on what is safe — the department scope, the price
band, and a decisive single-select answer on a structural tag like `Men` —
then **ranks** everything else. An exact tag match scores highest, a free-text
title match lowest, and a product outside the stated budget is penalised rather
than dropped.

---

## Checkout

Native cart → Shopify hosted checkout in a WebView. This is the standard,
store-policy-compliant approach for physical goods, and it means UPI,
netbanking, wallets, COD rules and the Shiprocket hand-off all work without
being reimplemented.

The app's one real job is detecting completion, so the local cart is cleared
rather than resurrecting as an empty bag on next launch. If the buyer backs out
mid-checkout the cart is re-read from Shopify, since stock or discounts may have
changed.

Signing in attaches the customer to the cart, so checkout opens pre-filled.

---

## Push notifications

The device side is in `src/notifications/`. Sending is a server concern — see
[`server/README.md`](server/README.md).

Campaign payloads carry `{ type, handle }` rather than a route path, and the app
maps that to a screen in `src/notifications/links.ts`. A route rename therefore
cannot break a scheduled campaign.

Remote push needs a real EAS project id. Run `eas init`, which replaces the
placeholder in `app.json`, then rebuild. Until then the notification settings
screen says so plainly instead of failing silently.

---

## Shipping to the stores

```bash
npm install -g eas-cli
eas login
eas init                 # sets the real projectId in app.json
eas build --platform all --profile production
eas submit --platform ios
eas submit --platform android
```

Before the first submission:

- Replace the `extra.eas.projectId` placeholder in `app.json` (`eas init` does this).
- Add app icon and splash assets in `assets/`.
- Set the real bundle identifier and package name if `in.ownlyclub.app` is not wanted.
- Add the Storefront credentials as EAS secrets so production builds are not
  built from a local `.env`.

---

## Testing

94 unit tests cover the logic that fails *silently* rather than loudly: the
Storefront query builder, the finder's ranking, attribute resolution and the
department registry's invariants. Screens are verified by building and running
the app, not by asserting on rendered markup.

```bash
npm test
```
