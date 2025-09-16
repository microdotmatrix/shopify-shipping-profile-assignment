import { assignVariantsToProfile, getVariantIdsByMetafield } from "./utils.js";

import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

const DELIVERY_PROFILE_ID = process.env.DELIVERY_PROFILE_ID;

const update = async () => {
  try {
    console.log("Collecting variant IDs by metafield…");
    const variantIds = await getVariantIdsByMetafield();
    console.log(`Found ${variantIds.length} variants to assign.`);

    if (variantIds.length === 0) {
      console.log("Nothing to do (no matching products/metafields).");
      return;
    }

    await assignVariantsToProfile(DELIVERY_PROFILE_ID, variantIds);
    console.log("All done ✅");
  } catch (e) {
    console.error("Failed:", e.message);
    process.exit(1);
  }
};

update();
