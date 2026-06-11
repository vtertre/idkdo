import { describe, expect, it } from "vitest";

import { BusinessRuleViolation } from "./business-rule-violation.js";
import { DomainError } from "./domain-error.js";

describe("BusinessRuleViolation", () => {
  it("is a domain error for business invariant failures", () => {
    const error = new BusinessRuleViolation("Wish cannot be reserved by its wisher", {
      code: "WISHER_CANNOT_RESERVE_WISH",
    });

    expect(error).toBeInstanceOf(DomainError);
    expect(error.name).toBe("BusinessRuleViolation");
    expect(error.code).toBe("WISHER_CANNOT_RESERVE_WISH");
  });
});
