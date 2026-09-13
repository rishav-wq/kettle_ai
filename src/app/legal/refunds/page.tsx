import { H1, H2, P, UL } from "../parts";

export const metadata = { title: "Kettle · Refunds and cancellation" };

export default function Refunds() {
  return (
    <>
      <H1>Refunds and cancellation</H1>
      <P muted>Last updated: to confirm before launch.</P>

      <H2>Try before you pay</H2>
      <P>
        Four full lessons are free to watch without an account and without a card. We would rather you decided from the free lessons than paid and
        felt stuck.
      </P>

      <H2>Cancelling</H2>
      <P>
        Gold is a single payment for a fixed period. There is nothing to cancel to stop future charges, because there are none. You can delete your
        account at any time from the account page, without telephoning anyone.
      </P>

      <H2>Getting your money back</H2>
      <UL
        items={[
          "Write to us within 7 days of paying and we will refund you in full, as long as you have watched no more than two paid lessons.",
          "If a payment was taken twice for the same thing, tell us and we will refund the duplicate in full, whenever you notice it.",
          "If you paid but membership never opened, tell us and we will either fix it or refund you.",
        ]}
      />

      <H2>How long a refund takes</H2>
      <P>
        We start the refund within 3 working days of agreeing to it. Razorpay and your bank then take their own time, usually 5 to 7 working days,
        to put the money back where it came from.
      </P>

      <H2>How to ask</H2>
      <P>
        Message us on WhatsApp from the help page, or write to the address on the contact page. Tell us the mobile number on the account. You do
        not need to explain yourself.
      </P>
    </>
  );
}
