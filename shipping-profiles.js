import { getShippingProfileIds } from "./utils.js";

// Get shipping profile IDs
const profiles = getShippingProfileIds();

profiles.then((ids) => console.log(ids));
