/*
  Browser-side bridge to the MSG91 OTP widget.

  The widget is used headless. `exposeMethods: true` hands us sendOtp and
  verifyOtp as plain functions, so Kettle keeps its own sign-in screen — the
  44px targets, the type floor, the six-box code input, and the scam warning
  that has to sit inside this flow rather than in a help page. None of that
  survives handing the screen to a third-party UI, and for this audience the
  screen is the product.

  Their API is callback-shaped. These wrap it in promises so the component can
  await it like every other call it makes.

  Nothing here is trusted. The token this produces is a claim; it becomes proof
  only when the server re-verifies it against MSG91 and learns the phone number
  from them rather than from us. See src/lib/auth/msg91-widget.ts.
*/

export const WIDGET_SCRIPT = "https://verify.msg91.com/otp-provider.js";

/*
  Captcha must stay OFF in the MSG91 widget settings.

  With it on, the widget also pulls https://hcaptcha.com/1/api.js and
  https://pass.hostnsoft.com/script.js. Both are blocked by our Content
  Security Policy, the provider script then throws, and the screen sits on
  "Sending…" forever with nothing in the server log to explain it — the failure
  is entirely in the browser console. That is a genuinely nasty way to lose an
  afternoon, which is why it is written down here.

  Turning it off was not only the quick fix. hostnsoft is undocumented and not
  an MSG91 domain, and allowing an unidentified script onto the page where
  people type their phone number and their code is not a trade worth making.
  hCaptcha is reputable, but a puzzle in front of the only door into the
  product is the wrong thing to show a 65-year-old on a cheap phone.

  Nothing is lost by disabling it: the abuse captcha guards against is already
  handled server-side — per-phone and per-IP limits, the resend gap, and the
  daily ceiling in src/lib/security/rate-limit.ts. Those cannot be bypassed by
  solving a puzzle.
*/

type Callback = (data: unknown) => void;

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void;
    sendOtp?: (identifier: string, success: Callback, failure: Callback) => void;
    retryOtp?: (channel: string | null, success: Callback, failure: Callback) => void;
    verifyOtp?: (otp: string, success: Callback, failure: Callback) => void;
  }
}

/** Starts the widget once the script has loaded. */
export function initWidget(widgetId: string, tokenAuth: string): void {
  window.initSendOTP?.({
    widgetId,
    tokenAuth,
    exposeMethods: true,
    // We drive the flow, so the widget's own success/failure hooks are unused.
    success: () => {},
    failure: () => {},
  });
}

/** MSG91 wants the country code with no plus: 919821340917. */
export function toIdentifier(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `91${digits.slice(-10)}`;
}

/*
  Their callbacks hand back either a bare string or an object, and the key
  varies by call. Rather than guess one, take the first thing that looks like a
  token — and return null if nothing does, so the caller fails visibly instead
  of posting undefined to the server.
*/
function extractToken(data: unknown): string | null {
  if (typeof data === "string" && data.trim() !== "") return data.trim();
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["message", "access-token", "accessToken", "token", "jwt"]) {
      const found = record[key];
      if (typeof found === "string" && found.trim() !== "") return found.trim();
    }
  }
  return null;
}

export function widgetSend(identifier: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.sendOtp) return reject(new Error("widget_not_ready"));
    window.sendOtp(identifier, () => resolve(), (err) => reject(err));
  });
}

export function widgetRetry(identifier: string): Promise<void> {
  // retryOtp resends on the configured channel; null keeps the widget's default.
  return new Promise((resolve, reject) => {
    if (!window.retryOtp) return widgetSend(identifier).then(resolve, reject);
    window.retryOtp(null, () => resolve(), (err) => reject(err));
  });
}

export function widgetVerify(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.verifyOtp) return reject(new Error("widget_not_ready"));
    window.verifyOtp(
      code,
      (data) => {
        const token = extractToken(data);
        if (token) resolve(token);
        else reject(new Error("no_token"));
      },
      (err) => reject(err)
    );
  });
}
