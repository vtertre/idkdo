import { describe, expect, it } from "vitest";

import { Uuid } from "./uuid.js";

describe("Uuid", () => {
  it("generates canonical lowercase UUID values", () => {
    const uuid = Uuid.random();

    expect(uuid.toString()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("parses canonical UUID values", () => {
    const uuid = Uuid.parse("018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111");

    expect(uuid.toString()).toBe("018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111");
  });

  it("normalizes uppercase UUID values", () => {
    const uuid = Uuid.parse("018F6EC2-6F5D-7F1A-8A8F-C05F0AB1A111");

    expect(uuid.toString()).toBe("018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111");
  });

  it("returns an existing Uuid unchanged from from", () => {
    const uuid = Uuid.random();

    expect(Uuid.from(uuid)).toBe(uuid);
  });

  it("parses string values from from", () => {
    const uuid = Uuid.from("018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111");

    expect(uuid.equals(Uuid.parse("018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111"))).toBe(true);
  });

  it("serializes as its canonical string", () => {
    const uuid = Uuid.parse("018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111");

    expect(String(uuid)).toBe("018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111");
    expect(uuid.toJSON()).toBe("018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111");
    expect(JSON.stringify({ uuid })).toBe('{"uuid":"018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111"}');
  });

  it("compares by canonical value", () => {
    const uuid = Uuid.parse("018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111");

    expect(uuid.equals(Uuid.parse("018F6EC2-6F5D-7F1A-8A8F-C05F0AB1A111"))).toBe(true);
    expect(uuid.equals(Uuid.parse("018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a112"))).toBe(false);
    expect(uuid.equals("018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111")).toBe(false);
  });

  it.each([
    ["018f6ec26f5d7f1a8a8fc05f0ab1a111"],
    ["{018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111}"],
    [" 018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111"],
    ["018f6ec2-6f5d-7f1a-8a8f-c05f0ab1a111 "],
    ["018f6ec2-6f5d-0f1a-8a8f-c05f0ab1a111"],
    ["018f6ec2-6f5d-7f1a-7a8f-c05f0ab1a111"],
    ["not-a-uuid"],
  ])("rejects invalid UUID value %s", (value) => {
    expect(() => Uuid.parse(value)).toThrow("Invalid UUID");
  });
});
