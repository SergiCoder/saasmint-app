export type InquirySource = "landing-cta" | "contact-page";

export interface InquiryInput {
  readonly email: string;
  readonly message?: string;
  readonly source: InquirySource;
  readonly honeypot?: string;
}

export interface IInquiryGateway {
  submit(input: InquiryInput): Promise<void>;
}
