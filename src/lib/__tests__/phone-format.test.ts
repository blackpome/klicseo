import { describe, it, expect } from "vitest";
import { formatPhone, phoneToIntlDigits, whatsappLink, telLink } from "../phone-shared";

describe("phone-shared formatters", () => {
  describe("formatPhone", () => {
    it("formats 10-digit number into standard +91 XXXXX XXXXX", () => {
      expect(formatPhone("9884504450")).toBe("+91 98845 04450");
      expect(formatPhone(9884504450 as unknown as string)).toBe("+91 98845 04450");
    });

    it("prevents duplicate +91 on already +91-prefixed strings", () => {
      expect(formatPhone("+91 89393 23456")).toBe("+91 89393 23456");
      expect(formatPhone("+918754815911")).toBe("+91 87548 15911");
      expect(formatPhone("+91  9940202442")).toBe("+91 99402 02442");
    });

    it("handles 12-digit numbers starting with 91", () => {
      expect(formatPhone("919884504450")).toBe("+91 98845 04450");
    });

    it("handles null / undefined / empty", () => {
      expect(formatPhone(null)).toBe("");
      expect(formatPhone(undefined)).toBe("");
      expect(formatPhone("")).toBe("");
    });
  });

  describe("phoneToIntlDigits", () => {
    it("converts 10-digit to 12-digit Indian format for WhatsApp", () => {
      expect(phoneToIntlDigits("9884504450")).toBe("919884504450");
      expect(phoneToIntlDigits("+91 98845 04450")).toBe("919884504450");
      expect(phoneToIntlDigits("+918754815911")).toBe("918754815911");
    });
  });

  describe("whatsappLink & telLink", () => {
    it("builds correct wa.me URL without duplicate 91", () => {
      expect(whatsappLink("+91 98845 04450")).toBe("https://wa.me/919884504450");
      expect(whatsappLink("9884504450", "Hello")).toBe("https://wa.me/919884504450?text=Hello");
    });

    it("builds correct tel: URL", () => {
      expect(telLink("+91 98845 04450")).toBe("tel:+919884504450");
    });
  });
});
