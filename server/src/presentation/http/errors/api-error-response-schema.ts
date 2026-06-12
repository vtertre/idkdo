export const apiErrorResponseSchema = {
  additionalProperties: false,
  properties: {
    error: {
      additionalProperties: false,
      properties: {
        code: { type: "string" },
        message: { type: "string" },
      },
      required: ["code", "message"],
      type: "object",
    },
  },
  required: ["error"],
  type: "object",
} as const;
