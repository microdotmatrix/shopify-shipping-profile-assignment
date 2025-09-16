# Fatass Glass

A Shopify utility script to manage shipping profiles by assigning product variants based on metafields.

## Description

This project provides scripts to interact with Shopify's Admin API for shipping profile management. It allows you to:

- Assign product variants to a specific delivery profile based on a product metafield.
- Retrieve and list available shipping profile IDs.

The main functionality involves querying products with a specific metafield value, collecting their variant IDs, and bulk-assigning them to a designated delivery profile using Shopify's GraphQL API.

## Installation

1. Clone or download this repository.
2. Install dependencies using npm or pnpm:

   ```bash
   npm install
   # or
   pnpm install
   ```

## Setup

1. Create a `.env.local` file in the project root (you can copy from an existing `.env` if available).
2. Fill in the required environment variables:

   ```env
   SHOP=your-shop-name.myshopify.com
   ADMIN_TOKEN=your-admin-api-access-token
   DELIVERY_PROFILE_ID=your-delivery-profile-id
   METAFIELD_NAMESPACE=your-metafield-namespace
   METAFIELD_KEY=your-metafield-key
   METAFIELD_VALUE=the-matching-value
   ```

   - `SHOP`: Your Shopify store domain.
   - `ADMIN_TOKEN`: Shopify Admin API access token with appropriate permissions.
   - `DELIVERY_PROFILE_ID`: The ID of the delivery profile to assign variants to.
   - `METAFIELD_NAMESPACE`, `METAFIELD_KEY`, `METAFIELD_VALUE`: The metafield details to filter products by.

## Usage

### Assign Variants to Profile

Run the main script to assign variants:

```bash
npm run assign
```

This will:
- Query products matching the specified metafield.
- Collect all variant IDs from those products.
- Assign the variants to the specified delivery profile in batches.

### List Shipping Profile IDs

To get a list of available delivery profile IDs:

```bash
npm run profiles
```

## Dependencies

- `dotenv`: For loading environment variables.
- `node-fetch`: For making HTTP requests to Shopify's API.

## API Requirements

This script uses Shopify's Admin API (GraphQL). Ensure your access token has the following scopes:
- `read_products`
- `write_delivery_profiles` (or equivalent for delivery profile management)

The API version used is `2025-07`. Update the endpoint in `utils.js` if necessary for newer versions.

## Configuration

You can adjust the following in `utils.js`:
- `USE_SEARCH_FILTER`: Set to `true` if your metafield supports indexed search for faster queries.
- `BATCH_SIZE`: Number of variants to assign per API request (default: 200).

## License

ISC
