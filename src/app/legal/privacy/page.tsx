import { H1, H2, P, UL } from "../parts";

export const metadata = { title: "Kettle · Privacy policy" };

export default function Privacy() {
  return (
    <>
      <H1>Privacy policy</H1>
      <P muted>Last updated: to confirm before launch.</P>

      <H2>What we collect</H2>
      <UL
        items={[
          "Your name and mobile number, which you give us when you sign in.",
          "Your city, only if you choose to add it.",
          "Which lessons you have watched and how far through you are.",
          "Payment records: the amount, the date, and the reference Razorpay gives us. We never see or store your card or UPI details.",
        ]}
      />

      <H2>Why we collect it</H2>
      <UL
        items={[
          "Your number is how you sign in. There is no password.",
          "Your progress is how the app remembers where you stopped.",
          "Your name is how we greet you, and the first name is shown to a friend who invited you.",
          "Payment records are kept because we are required to keep financial records.",
        ]}
      />

      <H2>What we do not do</H2>
      <UL
        items={[
          "We do not sell your details to anyone.",
          "We do not share your number with other learners.",
          "We will never telephone you to ask for a verification code. Anyone who does is not us.",
        ]}
      />

      <H2>Your choices</H2>
      <UL
        items={[
          "You can see and change your name, city, and language on the account page at any time.",
          "You can delete your account from the account page. Your name, number, and progress are erased immediately. An anonymous record of any payment remains, because we must keep financial records.",
          "You can turn WhatsApp reminders off at any time on the account page.",
        ]}
      />

      <H2>How long we keep it</H2>
      <P>
        Your account details stay for as long as you have an account. Financial records are kept for the period the law requires, with the link to
        you removed if you delete your account.
      </P>

      <H2>Grievance officer</H2>
      <P>
        If you are unhappy with how your information has been handled, write to our grievance officer and we will respond.
      </P>
      <P muted>Name, email, and postal address: TO CONFIRM before launch.</P>
    </>
  );
}
