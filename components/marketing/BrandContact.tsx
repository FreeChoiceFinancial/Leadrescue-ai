import { BRAND_EMAIL, BRAND_ENTITY_NAME, BRAND_PHONE_DISPLAY, BRAND_PHONE_E164, brandMailingAddress } from "@/lib/brand";

export function BrandContact({ className = "text-sm leading-relaxed" }: { className?: string }) {
  const address = brandMailingAddress();
  return (
    <address className={`not-italic ${className}`}>
      <span className="block">{BRAND_ENTITY_NAME}</span>
      {address ? <span className="block">{address}</span> : null}
      <a className="block underline" href={`mailto:${BRAND_EMAIL}`}>
        {BRAND_EMAIL}
      </a>
      <a className="block underline" href={`tel:${BRAND_PHONE_E164}`}>
        {BRAND_PHONE_DISPLAY}
      </a>
    </address>
  );
}
