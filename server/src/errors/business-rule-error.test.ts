import { describe, expect, it } from "vitest";

import { AppError } from "./app-error.js";
import { BusinessRuleError } from "./business-rule-error.js";

describe("BusinessRuleError", () => {
  it("is an application error for business rule failures", () => {
    const error = new BusinessRuleError(
      "Business rule failed.",
      "BUSINESS_RULE_FAILED",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.name).toBe("BusinessRuleError");
    expect(error.code).toBe("BUSINESS_RULE_FAILED");
  });
});
