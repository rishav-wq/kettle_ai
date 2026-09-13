import { H1, H2, P } from "../parts";

export const metadata = { title: "Kettle · Contact us" };

export default function Contact() {
  return (
    <>
      <H1>Contact us</H1>

      <H2>Write to us</H2>
      <P muted>Email address: TO CONFIRM before launch.</P>
      <P muted>WhatsApp number: TO CONFIRM before launch.</P>

      <H2>Registered address</H2>
      <P muted>
        Legal entity name and full postal address including the state and postcode: TO CONFIRM before launch. Razorpay requires a real, complete
        address here before a live account is approved.
      </P>

      <H2>When we reply</H2>
      <P>Monday to Saturday, 10am to 6pm. We aim to answer within one working day.</P>

      <H2>A note on safety</H2>
      <P>
        Kettle will never telephone you and ask for a verification code, a password, a card number, or a UPI PIN. If someone does, they are not from
        Kettle. Put the phone down and tell us.
      </P>
    </>
  );
}
