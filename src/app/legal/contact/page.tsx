import { Governing, H1, H2, P } from "../parts";
import { T } from "@/components/bilingual";

export const metadata = { title: "Kettle · Contact us" };

export default function Contact() {
  return (
    <>
      <H1>
        <T hi="हमसे संपर्क कीजिए" en="Contact us" />
      </H1>
      <Governing />

      <H2>
        <T hi="हमें लिखिए" en="Write to us" />
      </H2>
      <P muted>
        <T hi="Email पता: launch से पहले तय होना है।" en="Email address: TO CONFIRM before launch." />
      </P>
      <P muted>
        <T hi="WhatsApp नंबर: launch से पहले तय होना है।" en="WhatsApp number: TO CONFIRM before launch." />
      </P>

      <H2>
        <T hi="पंजीकृत पता" en="Registered address" />
      </H2>
      <P muted>
        <T
          hi="कानूनी संस्था का नाम और राज्य तथा पिनकोड सहित पूरा डाक पता: launch से पहले तय होना है। live खाता मंज़ूर करने से पहले Razorpay यहाँ पूरा और असली पता माँगता है।"
          en="Legal entity name and full postal address including the state and postcode: TO CONFIRM before launch. Razorpay requires a real, complete address here before a live account is approved."
        />
      </P>

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
