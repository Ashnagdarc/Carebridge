import {
  generateUID,
  formatUID,
  isValidUID,
} from "@/lib/uid";

describe("UID Utilities", () => {
  describe("generateUID", () => {
    it("should generate UID with correct format", () => {
      const uid = generateUID("John Doe", "patient-123");
      expect(uid).toMatch(/^[A-Z]{2}-\d{5}-\d{4}$/);
    });

    it("should use first 2 letters of name", () => {
      const uid = generateUID("John Doe", "patient-123");
      expect(uid.startsWith("JO")).toBe(true);
    });

    it("should handle single letter names", () => {
      const uid = generateUID("X", "patient-123");
      expect(uid).toMatch(/^X[A-Z]-\d{5}-\d{4}$/);
    });

    it("should generate different UIDs for different names", () => {
      const uid1 = generateUID("John Doe", "patient-123");
      const uid2 = generateUID("Jane Doe", "patient-123");
      expect(uid1.substring(0, 2)).not.toBe(uid2.substring(0, 2));
    });

    it("should extract ID portion from externalId", () => {
      const uid = generateUID("John Doe", "12345");
      expect(uid).toContain("12345");
    });
  });

  describe("formatUID", () => {
    it("should format valid UID", () => {
      const formatted = formatUID("JD-12345-6789");
      expect(formatted).toBe("JD-12345-6789");
    });

    it("should handle uppercase conversion", () => {
      const formatted = formatUID("jd-12345-6789");
      expect(formatted).toBe("JD-12345-6789");
    });

    it("should remove non-alphanumeric characters", () => {
      const formatted = formatUID("JD@12345#6789");
      expect(formatted).toMatch(/^JD-\d{5}-\d{4}$/);
    });
  });

  describe("isValidUID", () => {
    it("should validate correct UID format", () => {
      expect(isValidUID("JD-12345-6789")).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(isValidUID("JD12345-6789")).toBe(false);
      expect(isValidUID("J-12345-6789")).toBe(false);
      expect(isValidUID("JD-123-6789")).toBe(false);
      expect(isValidUID("jd-12345-6789")).toBe(false);
    });

    it("should reject empty string", () => {
      expect(isValidUID("")).toBe(false);
    });
  });
});
