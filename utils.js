/**
 * Bulk-assign product variants (identified by a product metafield) to a Shipping Profile.
 * - Looks for product metafield custom.dropship_id === "HBH"
 * - Collects all variant IDs for those products
 * - Calls deliveryProfileUpdate with variantsToAssociate in safe batches
 *
 * Run:  node assign-to-profile.js
 */

import fetch from "node-fetch";

import dotenv from "dotenv";
dotenv.config({
  path: ".env.local",
});

// ==== CONFIG – EDIT THESE ====
const SHOP = process.env.SHOP;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const DELIVERY_PROFILE_ID = process.env.DELIVERY_PROFILE_ID;
const METAFIELD_NAMESPACE = process.env.METAFIELD_NAMESPACE;
const METAFIELD_KEY = process.env.METAFIELD_KEY;
const METAFIELD_VALUE = process.env.METAFIELD_VALUE;

// If your metafield definition is marked "Use in admin filters", you can flip this to true
// to use an indexed search (faster); otherwise we’ll fetch & filter in code.
const USE_SEARCH_FILTER = false;

// Batch size for variantsToAssociate in a single mutation request
const BATCH_SIZE = 200;

// ==== GraphQL helper ====
async function gql(query, variables = {}) {
  const res = await fetch(`https://${SHOP}/admin/api/2025-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error(JSON.stringify(json.errors, null, 2));
    throw new Error("GraphQL top-level errors");
  }
  return json.data;
}

// ==== 1) Collect product variant IDs that match the metafield ====
export async function getVariantIdsByMetafield() {
  const variantIds = [];

  const baseFields = `
    id
    title
    variants(first: 250) { edges { node { id } } }
    metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") { value }
  `;

  // Option A: indexed search (if metafield filter enabled on the definition)
  const querySearch = `
    query($cursor: String) {
      products(first: 250, after: $cursor, query: "metafield:${METAFIELD_NAMESPACE}.${METAFIELD_KEY}=${METAFIELD_VALUE}") {
        edges { cursor node { ${baseFields} } }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  // Option B: full scan + filter in code (always works; slower on very large catalogs)
  const queryScan = `
    query($cursor: String) {
      products(first: 250, after: $cursor) {
        edges { cursor node { ${baseFields} } }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  let cursor = null;
  for (;;) {
    const data = await gql(USE_SEARCH_FILTER ? querySearch : queryScan, {
      cursor,
    });
    const conn = data.products;
    for (const edge of conn.edges) {
      const p = edge.node;
      const mfVal = p.metafield?.value ?? null;
      // When scanning, filter here; when search filter is on, this condition should already be true
      if (mfVal === METAFIELD_VALUE) {
        for (const vEdge of p.variants.edges) {
          variantIds.push(vEdge.node.id);
        }
      }
    }
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }

  // De-duplicate (in case a product shows up multiple times across pages)
  return [...new Set(variantIds)];
}

// ==== 2) Assign variants to the Delivery Profile in batches ====
const DELIVERY_PROFILE_UPDATE = `
  mutation AssignVariants($id: ID!, $profile: DeliveryProfileInput!) {
    deliveryProfileUpdate(id: $id, profile: $profile) {
      profile { id name }
      userErrors { field message }
    }
  }
`;

export async function getShippingProfileIds() {
  const data = await gql(`
    query {
      deliveryProfiles(first: 5) {
        edges { node { id name } }
      }
    }
  `);
  return data.deliveryProfiles.edges.map((edge) => edge.node.id);
}

// Note: deliveryProfileUpdate supports associating/dissociating variants from the profile.
// The input fields you’ll use are `variantsToAssociate` (and optionally `variantsToDissociate`).
// Ref: deliveryProfileUpdate + DeliveryProfileItem docs. (See citations in chat.)
export async function assignVariantsToProfile(profileId, variantIds) {
  let assigned = 0;

  for (let i = 0; i < variantIds.length; i += BATCH_SIZE) {
    const batch = variantIds.slice(i, i + BATCH_SIZE);
    const variables = {
      id: profileId,
      profile: {
        // You can also include other parts of the profile if you need to update rates/zones,
        // but here we only change the membership (assignment) of variants.
        variantsToAssociate: batch,
      },
    };
    const data = await gql(DELIVERY_PROFILE_UPDATE, variables);
    const errs = data.deliveryProfileUpdate.userErrors;
    if (errs && errs.length) {
      console.error("UserErrors on batch", i / BATCH_SIZE, errs);
      throw new Error("deliveryProfileUpdate returned userErrors");
    }
    assigned += batch.length;
    console.log(
      `✓ Associated ${assigned}/${variantIds.length} variants to ${data.deliveryProfileUpdate.profile.name}`
    );
  }
}
