import { z } from "zod";

import { createWishRequestBodySchema } from "./create-wish-request-body-schema.js";

export const updateWishRequestBodySchema = createWishRequestBodySchema;

export type UpdateWishRequestBody = z.infer<
  typeof updateWishRequestBodySchema
>;
