import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/actions/marketing", () => ({
  submitInquiry: vi.fn(),
}));

import { ContactForm } from "@/app/[locale]/(marketing)/contact/_components/ContactForm";

const baseProps = {
  placeholder: "Your email",
  messagePlaceholder: "Your message",
  submitLabel: "Send",
  successTitle: "Message sent",
  successBody: "Thanks!",
};

describe("ContactForm", () => {
  it("renders the email and message fields with the source hidden input", () => {
    const { container } = render(<ContactForm {...baseProps} />);

    const source = container.querySelector(
      'input[type="hidden"][name="source"]',
    ) as HTMLInputElement | null;
    expect(source?.value).toBe("contact-page");

    expect(
      container.querySelector('input[type="email"][name="email"]'),
    ).not.toBeNull();
    expect(container.querySelector('textarea[name="message"]')).not.toBeNull();
  });

  it("includes a hidden honeypot input that's accessible to bots but not users", () => {
    const { container } = render(<ContactForm {...baseProps} />);
    const honeypot = container.querySelector(
      'input[name="honeypot"]',
    ) as HTMLInputElement | null;

    expect(honeypot).not.toBeNull();
    expect(honeypot?.tabIndex).toBe(-1);
    expect(honeypot?.getAttribute("aria-hidden")).toBe("true");
    // Off-screen via positioning, not display:none — bots that respect
    // display:none would otherwise skip the field and defeat the trap.
    expect(honeypot?.className).toMatch(/-left-\[9999px\]/);
  });

  it("caps the textarea length at 5000 characters", () => {
    const { container } = render(<ContactForm {...baseProps} />);
    const textarea = container.querySelector(
      'textarea[name="message"]',
    ) as HTMLTextAreaElement | null;
    expect(textarea?.maxLength).toBe(5000);
  });

  it("renders the submit button with the provided label", () => {
    render(<ContactForm {...baseProps} />);
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });
});
