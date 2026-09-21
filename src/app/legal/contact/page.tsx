import { ContactLines, Governing, H1, H2, P, RegisteredAddress } from "../parts";
import { T } from "@/components/bilingual";
import { getSiteContent } from "@/lib/content/site";

export const metadata = { title: "Kettle · Contact us" };

export default function Contact() {
  const { business } = getSiteContent();

  return (
    <>
      <H1>
        <T hi="हमसे संपर्क कीजिए" en="Contact us" />
      </H1>
      <Governing />

      <H2>
        <T hi="हमें लिखिए" en="Write to us" />
      </H2>
      {business ? <ContactLines business={business} /> : null}

      <H2>
        <T hi="पंजीकृत पता" en="Registered address" />
      </H2>
      {business ? <RegisteredAddress business={business} /> : null}

      <H2>
        <T hi="हम कब जवाब देते हैं" en="When we reply" />
      </H2>
      <P>
        <T
          hi="किसी भी समय, दिन हो या रात। Gold सदस्यों के संदेश पहले देखे जाते हैं; बाकी सबको भी जवाब मिलता है।"
          en="Any time, day or night. Gold members’ messages are looked at first; everyone else gets a reply too."
        />
      </P>

      <H2>
        <T hi="सुरक्षा के बारे में एक बात" en="A note on safety" />
      </H2>
      <P>
        <T
          hi="Kettle आपको कभी फ़ोन करके verification code, password, कार्ड नंबर या UPI PIN नहीं पूछेगा। अगर कोई ऐसा करे, तो वह Kettle से नहीं है। फ़ोन रख दीजिए और हमें बताइए।"
          en="Kettle will never telephone you and ask for a verification code, a password, a card number, or a UPI PIN. If someone does, they are not from Kettle. Put the phone down and tell us."
        />
      </P>
    </>
  );
}
