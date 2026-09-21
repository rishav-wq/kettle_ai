import type { ReactNode } from "react";
import { T } from "@/components/bilingual";
import type { Business } from "@/lib/content/site";

/** Shared typography for the policy pages, so they read as one document. */

export function H1({ children }: { children: ReactNode }) {
  return <h1 className="text-[1.7rem] font-bold leading-tight">{children}</h1>;
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-5 text-[1.1rem] font-bold leading-snug">{children}</h2>;
}

export function P({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <p className={`max-w-[62ch] leading-relaxed ${muted ? "text-[0.88rem] text-ink-3" : "text-[0.96rem] text-ink-2"}`}>{children}</p>;
}

/** A list of bilingual points. Each item is the same point in both languages. */
export function UL({ items }: { items: readonly { hi: string; en: string }[] }) {
  return (
    <ul className="flex max-w-[62ch] flex-col gap-2.5">
      {items.map((t) => (
        <li key={t.en} className="flex gap-3 text-[0.96rem] leading-relaxed text-ink-2">
          <span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 flex-none rounded-full bg-violet" />
          <T hi={t.hi} en={t.en} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Which version wins.
 *
 * A translated policy that does not say this is worse than none: two texts
 * with equal standing and no rule for disagreement is exactly the ambiguity a
 * policy exists to remove.
 */
export function Governing() {
  return (
    <P muted>
      <T
        hi="यह हिंदी रूपांतर समझने की सुविधा के लिए है। किसी मतभेद की स्थिति में अंग्रेज़ी पाठ मान्य होगा।"
        en="This Hindi version is provided for ease of understanding. If the two ever disagree, the English text governs."
      />
    </P>
  );
}

/*
  The business details, rendered from one block in content/kettle-site.json.

  These used to be typed into each policy page as "TO CONFIRM before launch",
  which meant the same fact had four homes and four chances to disagree. A
  payment provider's reviewer compares them.

  While `placeholder` is set, every one of these renders outlined and chipped,
  so an unfinished policy page is obvious on the page itself rather than only
  in a grep.
*/

/** Wraps unfinished detail so it cannot be mistaken for the real thing. */
export function Pending({ children, when }: { children: ReactNode; when: boolean }) {
  if (!when) return <>{children}</>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-tile border border-dashed border-line px-2.5 py-1">
      <span className="rounded-pill bg-wash px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-ink-3">Example</span>
      <span className="text-ink-3">{children}</span>
    </span>
  );
}

/** The registered entity and its full postal address, as Razorpay requires it. */
export function RegisteredAddress({ business }: { business: Business }) {
  const pending = business.placeholder === true;
  return (
    <P muted>
      <Pending when={pending}>
        {business.legalName} ({business.entityType})
        <br />
        {business.addressLines.filter(Boolean).map((line) => (
          <span key={line}>
            {line}
            <br />
          </span>
        ))}
        {business.city}, {business.state} {business.postcode}
        <br />
        {business.country}
      </Pending>
    </P>
  );
}

/** Email and a telephone number. Razorpay asks for both, publicly reachable. */
export function ContactLines({ business }: { business: Business }) {
  const pending = business.placeholder === true;
  return (
    <>
      <P muted>
        <Pending when={pending}>
          <T hi="ईमेल: " en="Email: " />
          {business.email}
        </Pending>
      </P>
      <P muted>
        <Pending when={pending}>
          <T hi="फ़ोन: " en="Telephone: " />
          {business.phone}
        </Pending>
      </P>
      <P muted>
        <Pending when={pending}>
          <T hi="WhatsApp: " en="WhatsApp: " />
          {business.whatsapp}
        </Pending>
      </P>
    </>
  );
}

/** "Last updated", from the one place that holds the date. */
export function LastUpdated({ business }: { business: Business }) {
  const pending = business.placeholder === true;
  return (
    <P muted>
      <Pending when={pending}>
        <T hi={`आख़िरी बदलाव: ${business.updated}`} en={`Last updated: ${business.updated}`} />
      </Pending>
    </P>
  );
}
