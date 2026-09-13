import { H1, H2, P, UL } from "../parts";

export const metadata = { title: "Kettle · Terms of use" };

export default function Terms() {
  return (
    <>
      <H1>Terms of use</H1>
      <P muted>Last updated: to confirm before launch.</P>

      <H2>What Kettle is</H2>
      <P>
        Kettle sells access to video courses that teach everyday uses of artificial intelligence. Four lessons are free to watch without an
        account. The rest open with a Gold membership.
      </P>

      <H2>Your account</H2>
      <UL
        items={[
          "You sign in with your own mobile number. Do not share the verification code with anyone, including anyone claiming to be from Kettle.",
          "You are responsible for what happens on your account. Tell us straight away if you think someone else has access to it.",
          "One account is for one person. Please do not share your sign-in with others.",
        ]}
      />

      <H2>Gold membership</H2>
      <UL
        items={[
          "Gold is a single payment for a fixed period, shown to you before you pay. It does not renew automatically and no money is taken again without you choosing to pay.",
          "Access ends when the period ends. Anything you have already watched stays watched, and your progress is kept.",
          "We may add or change courses. If a course you were part-way through is withdrawn, we will tell you.",
        ]}
      />

      <H2>What you may not do</H2>
      <UL
        items={[
          "Record, download, re-upload, or resell the videos.",
          "Try to reach lessons you have not paid for.",
          "Use Kettle to break the law or to harm anyone.",
        ]}
      />

      <H2>What the courses are and are not</H2>
      <P>
        The courses are educational. They are not legal, medical, or financial advice. Tools made by other companies are described as they behave
        at the time of recording, and those companies may change them.
      </P>

      <H2>Ending your account</H2>
      <P>
        You can delete your account at any time from the account page. We may suspend an account that breaks these terms, and we will explain why.
      </P>

      <H2>Governing law</H2>
      <P muted>Jurisdiction and the legal entity name: TO CONFIRM before launch.</P>
    </>
  );
}
