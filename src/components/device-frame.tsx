import type { ReactNode } from "react";

/*
  Device chrome for the hero.

  Drawn rather than photographed. A bitmap mockup would be locked to one width,
  would go soft on a retina phone, and would not follow the palette; this scales
  to any column and costs nothing to download.

  Both frames hand their child a screen of a fixed aspect ratio with the child
  as the only thing inside it, so the content decides its own layout and the
  frame never has to know what it is wrapping.
*/

/** A phone, seen straight on. Screen is 9:16, the shape of a real handset. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[290px]">
      {/* The shadow the handset casts, kept separate so it stays soft under the
          hard edge of the body. */}
      <div aria-hidden className="absolute inset-x-6 bottom-1 h-10 rounded-[999px] bg-black/25 blur-2xl" />

      <div className="relative rounded-[46px] bg-device p-[9px] shadow-l ring-1 ring-inset ring-device-edge">
        {/* Side buttons. Slivers, because at this size anything more reads as damage. */}
        <span aria-hidden className="absolute -left-[2px] top-[92px] h-7 w-[3px] rounded-l-sm bg-device-edge" />
        <span aria-hidden className="absolute -left-[2px] top-[132px] h-12 w-[3px] rounded-l-sm bg-device-edge" />
        <span aria-hidden className="absolute -right-[2px] top-[118px] h-16 w-[3px] rounded-r-sm bg-device-edge" />

        <div className="relative aspect-[9/16] overflow-hidden rounded-[38px] bg-wash">
          {/* The camera island, over the top of whatever the screen is showing. */}
          <span
            aria-hidden
            className="absolute left-1/2 top-[9px] z-20 flex h-[26px] w-[84px] -translate-x-1/2 items-center justify-end rounded-pill bg-device pr-2.5"
          >
            <span className="h-[7px] w-[7px] rounded-full bg-white/25" />
          </span>
          {children}
        </div>
      </div>
    </div>
  );
}

/** A laptop, lid open. Screen is 16:10; the base is what sells the angle. */
export function LaptopFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div aria-hidden className="absolute inset-x-10 bottom-0 h-12 rounded-[999px] bg-black/25 blur-2xl" />

      {/* Lid. The top bezel is a little deeper than the sides to hold the camera. */}
      <div className="relative rounded-t-[20px] bg-device px-[11px] pb-[11px] pt-[20px] shadow-l ring-1 ring-inset ring-device-edge">
        <span aria-hidden className="absolute left-1/2 top-[8px] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-white/25" />
        <div className="relative aspect-[16/10] overflow-hidden rounded-[6px] bg-wash">{children}</div>
      </div>

      {/* Base. Wider than the lid, as a real one is, with the notch you open it by. */}
      <div className="relative left-1/2 h-[14px] w-[112%] -translate-x-1/2 rounded-b-[10px] rounded-t-[3px] bg-linear-to-b from-device-edge to-device">
        <span aria-hidden className="absolute left-1/2 top-0 h-[5px] w-[96px] -translate-x-1/2 rounded-b-[6px] bg-black/35" />
      </div>
    </div>
  );
}
