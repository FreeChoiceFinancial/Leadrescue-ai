import type { Metadata } from "next";
import { BrandContact } from "@/components/marketing/BrandContact";
import { PhoneOptInForm } from "@/components/marketing/PhoneOptInForm";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-2">
      <div>
        <h1 className="font-display text-5xl">Contact</h1>
        <p className="mt-4 text-ink/75">
          Send a note about LeadRescue AI. The SMS checkbox is optional and starts unchecked. This form does not send a
          text.
        </p>
        <div className="mt-6">
          <BrandContact />
        </div>
      </div>
      <PhoneOptInForm source="contact" includeMessage />
    </div>
  );
}
