# Push notification server

The app registers its Expo push token with this service and sends the buyer's
topic preferences alongside it. Sending campaigns is a separate, manual step —
there is no automation here, by design.

## Why it is this small

Expo's push service does the hard part (APNs and FCM delivery, retries,
receipts). All this service has to do is remember which device asked for what.
At Ownly's scale that is a JSON file, not a database, and it means the whole
thing has zero dependencies.

Replace `readStore` / `writeStore` in `push-server.mjs` with real persistence
when the device count makes a file impractical.

## Run it

```bash
node server/push-server.mjs serve
```

Then point the app at it:

```
EXPO_PUBLIC_PUSH_REGISTRATION_URL=https://push.yourdomain.com/register
```

Behind a reverse proxy, terminate TLS there. The endpoint takes no secret —
an Expo push token is not sensitive on its own, and the worst a bad actor can
do is register a token they already control.

## Send a campaign

```bash
# A new arrival, deep-linking to the product page
node server/push-server.mjs send \
  --topic drops \
  --title "Just landed" \
  --body "Tom Ford Oud Wood is back in stock" \
  --type product --handle tom-ford-oud-wood

# An offer, deep-linking to a collection
node server/push-server.mjs send \
  --topic offers \
  --title "48 hours only" \
  --body "20% off Acqua di Parma" \
  --type collection --handle acqua-di-parma
```

`--type` accepts `product`, `collection`, `search`, `orders`, `cart` and
`finder`. The app maps that to a route itself (`src/notifications/links.ts`), so
a campaign never breaks when a route is renamed.

## Check who is opted in

```bash
node server/push-server.mjs stats
```

## Order notifications

Order confirmation and dispatch pushes should be triggered by Shopify, not by
hand. Add a Shopify webhook for `orders/fulfilled` that calls `send` with
`--topic orders --type orders`. That requires mapping a Shopify customer to a
device token, which this service does not do yet — it stores tokens
anonymously. Add a `customerId` to the registration payload first if you want
per-customer targeting.
