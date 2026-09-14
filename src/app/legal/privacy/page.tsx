import { Governing, H1, H2, P, UL } from "../parts";
import { T } from "@/components/bilingual";

export const metadata = { title: "Kettle · Privacy policy" };

export default function Privacy() {
  return (
    <>
      <H1>
        <T hi="निजता नीति" en="Privacy policy" />
      </H1>
      <P muted>
        <T hi="आख़िरी बदलाव: launch से पहले तय होना है।" en="Last updated: to confirm before launch." />
      </P>
      <Governing />

      <H2>
        <T hi="हम क्या इकट्ठा करते हैं" en="What we collect" />
      </H2>
      <UL
        items={[
          {
            hi: "आपका नाम और मोबाइल नंबर, जो आप साइन इन करते समय हमें देते हैं।",
            en: "Your name and mobile number, which you give us when you sign in.",
          },
          { hi: "आपका शहर, सिर्फ़ तब जब आप खुद जोड़ना चाहें।", en: "Your city, only if you choose to add it." },
          { hi: "आपने कौन से lessons देखे और कितना देखा।", en: "Which lessons you have watched and how far through you are." },
          {
            hi: "Payment का ब्योरा: रकम, तारीख़, और Razorpay से मिला reference। आपके कार्ड या UPI की जानकारी हम न देखते हैं, न रखते हैं।",
            en: "Payment records: the amount, the date, and the reference Razorpay gives us. We never see or store your card or UPI details.",
          },
        ]}
      />

      <H2>
        <T hi="क्यों इकट्ठा करते हैं" en="Why we collect it" />
      </H2>
      <UL
        items={[
          { hi: "आपका नंबर ही साइन इन का ज़रिया है। कोई password नहीं है।", en: "Your number is how you sign in. There is no password." },
          { hi: "आपकी प्रगति से ही app याद रखता है कि आप कहाँ रुके थे।", en: "Your progress is how the app remembers where you stopped." },
          {
            hi: "आपके नाम से हम आपका अभिवादन करते हैं, और पहला नाम उस दोस्त को दिखता है जिसने आपको बुलाया।",
            en: "Your name is how we greet you, and the first name is shown to a friend who invited you.",
          },
          {
            hi: "Payment का ब्योरा इसलिए रखा जाता है क्योंकि वित्तीय अभिलेख रखना हमारे लिए ज़रूरी है।",
            en: "Payment records are kept because we are required to keep financial records.",
          },
        ]}
      />

      <H2>
        <T hi="हम क्या नहीं करते" en="What we do not do" />
      </H2>
      <UL
        items={[
          { hi: "हम आपकी जानकारी किसी को नहीं बेचते।", en: "We do not sell your details to anyone." },
          { hi: "हम आपका नंबर दूसरे सीखने वालों को नहीं बताते।", en: "We do not share your number with other learners." },
          {
            hi: "हम आपको कभी फ़ोन करके verification code नहीं पूछेंगे। जो कोई ऐसा करे, वह हम नहीं हैं।",
            en: "We will never telephone you to ask for a verification code. Anyone who does is not us.",
          },
        ]}
      />

      <H2>
        <T hi="आपके पास क्या विकल्प हैं" en="Your choices" />
      </H2>
      <UL
        items={[
          {
            hi: "आप अपना नाम, शहर और भाषा खाता पेज पर जब चाहें देख और बदल सकते हैं।",
            en: "You can see and change your name, city, and language on the account page at any time.",
          },
          {
            hi: "आप खाता पेज से अपना खाता मिटा सकते हैं। आपका नाम, नंबर और प्रगति तुरंत मिट जाते हैं। किसी payment का बेनाम अभिलेख बना रहता है, क्योंकि वित्तीय अभिलेख रखना ज़रूरी है।",
            en: "You can delete your account from the account page. Your name, number, and progress are erased immediately. An anonymous record of any payment remains, because we must keep financial records.",
          },
          {
            hi: "आप WhatsApp पर आने वाली याद-दिलाने वाली सूचनाएँ खाता पेज से कभी भी बंद कर सकते हैं।",
            en: "You can turn WhatsApp reminders off at any time on the account page.",
          },
        ]}
      />

      <H2>
        <T hi="हम इसे कितने समय तक रखते हैं" en="How long we keep it" />
      </H2>
      <P>
        <T
          hi="जब तक आपका खाता है, तब तक आपके खाते का ब्योरा रहता है। वित्तीय अभिलेख उतने समय तक रखे जाते हैं जितना कानून कहता है — और खाता मिटाने पर उनसे आपकी पहचान हटा दी जाती है।"
          en="Your account details stay for as long as you have an account. Financial records are kept for the period the law requires, with the link to you removed if you delete your account."
        />
      </P>

      <H2>
        <T hi="शिकायत अधिकारी" en="Grievance officer" />
      </H2>
      <P>
        <T
          hi="अगर आपकी जानकारी जिस तरह संभाली गई उससे आप असंतुष्ट हैं, तो हमारे शिकायत अधिकारी को लिखिए — हम जवाब देंगे।"
          en="If you are unhappy with how your information has been handled, write to our grievance officer and we will respond."
        />
      </P>
      <P muted>
        <T hi="नाम, email और डाक पता: launch से पहले तय होना है।" en="Name, email, and postal address: TO CONFIRM before launch." />
      </P>
    </>
  );
}
