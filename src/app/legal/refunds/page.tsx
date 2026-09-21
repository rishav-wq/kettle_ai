import { Governing, H1, H2, LastUpdated, P, UL } from "../parts";
import { T } from "@/components/bilingual";
import { getSiteContent } from "@/lib/content/site";

export const metadata = { title: "Kettle · Refunds and cancellation" };

export default function Refunds() {
  const { business } = getSiteContent();

  return (
    <>
      <H1>
        <T hi="वापसी और रद्द करना" en="Refunds and cancellation" />
      </H1>
      {business ? <LastUpdated business={business} /> : null}
      <Governing />

      <H2>
        <T hi="पैसे देने से पहले आज़माइए" en="Try before you pay" />
      </H2>
      <P>
        <T
          hi="चार पूरे lessons बिना खाते और बिना कार्ड के मुफ़्त देखे जा सकते हैं। हम यही चाहेंगे कि आप मुफ़्त lessons देखकर तय करें, बजाय इसके कि पैसे देकर फँसा हुआ महसूस करें।"
          en="Four full lessons are free to watch without an account and without a card. We would rather you decided from the free lessons than paid and felt stuck."
        />
      </P>

      <H2>
        <T hi="रद्द करना" en="Cancelling" />
      </H2>
      <P>
        <T
          hi="Gold एक तय अवधि के लिए एक बार का payment है। आगे की कटौती रोकने के लिए कुछ रद्द करने की ज़रूरत नहीं, क्योंकि आगे कोई कटौती है ही नहीं। आप जब चाहें खाता पेज से अपना खाता मिटा सकते हैं, बिना किसी को फ़ोन किए।"
          en="Gold is a single payment for a fixed period. There is nothing to cancel to stop future charges, because there are none. You can delete your account at any time from the account page, without telephoning anyone."
        />
      </P>

      <H2>
        <T hi="पैसे वापस पाना" en="Getting your money back" />
      </H2>
      <UL
        items={[
          {
            hi: "payment के 7 दिनों के भीतर हमें लिखिए और हम पूरा पैसा वापस कर देंगे, बशर्ते आपने दो से ज़्यादा paid lessons न देखे हों।",
            en: "Write to us within 7 days of paying and we will refund you in full, as long as you have watched no more than two paid lessons.",
          },
          {
            hi: "अगर एक ही चीज़ के लिए दो बार पैसे कट गए, तो हमें बताइए — हम दूसरी बार का पूरा पैसा वापस कर देंगे, चाहे आपको जब भी पता चले।",
            en: "If a payment was taken twice for the same thing, tell us and we will refund the duplicate in full, whenever you notice it.",
          },
          {
            hi: "अगर पैसे कट गए पर सदस्यता नहीं खुली, तो हमें बताइए — हम या तो उसे ठीक करेंगे या पैसे वापस कर देंगे।",
            en: "If you paid but membership never opened, tell us and we will either fix it or refund you.",
          },
        ]}
      />

      <H2>
        <T hi="वापसी में कितना समय लगता है" en="How long a refund takes" />
      </H2>
      <P>
        <T
          hi="सहमति के 3 कार्य-दिवसों के भीतर हम वापसी शुरू कर देते हैं। उसके बाद Razorpay और आपका बैंक अपना समय लेते हैं — आम तौर पर 5 से 7 कार्य-दिवस — पैसा वहीं लौटाने में जहाँ से आया था।"
          en="We start the refund within 3 working days of agreeing to it. Razorpay and your bank then take their own time, usually 5 to 7 working days, to put the money back where it came from."
        />
      </P>

      <H2>
        <T hi="कैसे कहें" en="How to ask" />
      </H2>
      <P>
        <T
          hi="मदद पेज से WhatsApp पर संदेश भेजिए, या संपर्क पेज पर दिए पते पर लिखिए। खाते वाला मोबाइल नंबर बता दीजिए। कोई सफ़ाई देने की ज़रूरत नहीं।"
          en="Message us on WhatsApp from the help page, or write to the address on the contact page. Tell us the mobile number on the account. You do not need to explain yourself."
        />
      </P>
    </>
  );
}
