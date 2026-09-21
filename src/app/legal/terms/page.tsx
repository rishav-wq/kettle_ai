import { Governing, H1, H2, LastUpdated, P, Pending, UL } from "../parts";
import { T } from "@/components/bilingual";
import { getSiteContent } from "@/lib/content/site";

export const metadata = { title: "Kettle · Terms of use" };

export default function Terms() {
  const { business } = getSiteContent();

  return (
    <>
      <H1>
        <T hi="इस्तेमाल की शर्तें" en="Terms of use" />
      </H1>
      {business ? <LastUpdated business={business} /> : null}
      <Governing />

      <H2>
        <T hi="Kettle क्या है" en="What Kettle is" />
      </H2>
      <P>
        <T
          hi="Kettle उन video कोर्स तक पहुँच बेचता है जो artificial intelligence के रोज़मर्रा इस्तेमाल सिखाते हैं। चार lessons बिना खाते के मुफ़्त देखे जा सकते हैं। बाकी Gold सदस्यता से खुलते हैं। सारे दाम भारतीय रुपये (INR) में हैं।"
          en="Kettle sells access to video courses that teach everyday uses of artificial intelligence. Four lessons are free to watch without an account. The rest open with a Gold membership. All prices are in Indian rupees (INR)."
        />
      </P>
      {business ? (
        <P muted>
          <Pending when={business.placeholder === true}>
            <T hi="यह सेवा चलाई जाती है " en="This service is operated by " />
            {business.legalName} ({business.entityType}), {business.city}, {business.state}.
          </Pending>
        </P>
      ) : null}

      <H2>
        <T hi="आपका खाता" en="Your account" />
      </H2>
      <UL
        items={[
          {
            hi: "आप अपने ही मोबाइल नंबर से साइन इन करते हैं। verification code किसी को न बताइए — उसे भी नहीं जो खुद को Kettle का बताए।",
            en: "You sign in with your own mobile number. Do not share the verification code with anyone, including anyone claiming to be from Kettle.",
          },
          {
            hi: "आपके खाते पर जो होता है, उसकी ज़िम्मेदारी आपकी है। अगर आपको लगे कि किसी और की पहुँच बन गई है, तो हमें तुरंत बताइए।",
            en: "You are responsible for what happens on your account. Tell us straight away if you think someone else has access to it.",
          },
          {
            hi: "एक खाता एक व्यक्ति के लिए है। कृपया अपना साइन इन दूसरों के साथ साझा न कीजिए।",
            en: "One account is for one person. Please do not share your sign-in with others.",
          },
        ]}
      />

      <H2>
        <T hi="Gold सदस्यता" en="Gold membership" />
      </H2>
      <UL
        items={[
          {
            hi: "Gold एक तय अवधि के लिए एक बार का payment है, जो आपको भुगतान से पहले दिखाया जाता है। यह अपने आप दोबारा नहीं चलता और आपकी मर्ज़ी के बिना दोबारा पैसे नहीं कटते।",
            en: "Gold is a single payment for a fixed period, shown to you before you pay. It does not renew automatically and no money is taken again without you choosing to pay.",
          },
          {
            hi: "अवधि पूरी होने पर पहुँच समाप्त हो जाती है। जो आप देख चुके हैं वह देखा हुआ ही रहता है, और आपकी प्रगति सुरक्षित रहती है।",
            en: "Access ends when the period ends. Anything you have already watched stays watched, and your progress is kept.",
          },
          {
            hi: "हम कोर्स जोड़ या बदल सकते हैं। अगर कोई ऐसा कोर्स हटाया जाए जिसे आप बीच में छोड़कर गए थे, तो हम आपको बताएँगे।",
            en: "We may add or change courses. If a course you were part-way through is withdrawn, we will tell you.",
          },
        ]}
      />

      <H2>
        <T hi="आप क्या नहीं कर सकते" en="What you may not do" />
      </H2>
      <UL
        items={[
          {
            hi: "वीडियो record करना, download करना, दोबारा upload करना या बेचना।",
            en: "Record, download, re-upload, or resell the videos.",
          },
          { hi: "उन lessons तक पहुँचने की कोशिश करना जिनके पैसे नहीं दिए।", en: "Try to reach lessons you have not paid for." },
          { hi: "Kettle का इस्तेमाल कानून तोड़ने या किसी को नुक़सान पहुँचाने में करना।", en: "Use Kettle to break the law or to harm anyone." },
        ]}
      />

      <H2>
        <T hi="कोर्स क्या हैं और क्या नहीं" en="What the courses are and are not" />
      </H2>
      <P>
        <T
          hi="कोर्स शैक्षिक हैं। ये कानूनी, चिकित्सकीय या वित्तीय सलाह नहीं हैं। दूसरी कंपनियों के बनाए tools को वैसे ही बताया गया है जैसे वे recording के समय काम करते थे, और वे कंपनियाँ उन्हें बदल सकती हैं।"
          en="The courses are educational. They are not legal, medical, or financial advice. Tools made by other companies are described as they behave at the time of recording, and those companies may change them."
        />
      </P>

      <H2>
        <T hi="खाता बंद करना" en="Ending your account" />
      </H2>
      <P>
        <T
          hi="आप जब चाहें खाता पेज से अपना खाता मिटा सकते हैं। इन शर्तों को तोड़ने वाला खाता हम रोक सकते हैं, और इसकी वजह बताएँगे।"
          en="You can delete your account at any time from the account page. We may suspend an account that breaks these terms, and we will explain why."
        />
      </P>

      <H2>
        <T hi="कैसे मिलता है" en="How you receive what you buy" />
      </H2>
      <P>
        <T
          hi="Kettle एक डिजिटल सेवा है। कुछ भी भेजा नहीं जाता। payment पूरा होते ही आपके खाते पर पहुँच खुल जाती है, आम तौर पर कुछ ही पलों में — Razorpay से पुष्टि मिलते ही। अगर पैसे कट गए और पहुँच नहीं खुली, तो हमें बताइए।"
          en="Kettle is a digital service. Nothing is shipped. Access opens on your account as soon as the payment is confirmed, usually within moments of Razorpay telling us. If money has left your account and access has not opened, tell us."
        />
      </P>

      <H2>
        <T hi="लागू कानून" en="Governing law" />
      </H2>
      {business ? (
        <P muted>
          <Pending when={business.placeholder === true}>
            <T hi="ये शर्तें भारत के कानून से चलती हैं। अधिकार-क्षेत्र: " en="These terms are governed by the laws of India. Jurisdiction: " />
            {business.jurisdiction}. {business.legalName} ({business.entityType}).
          </Pending>
        </P>
      ) : null}
    </>
  );
}
