/**
 * The interface is English only.
 *
 * This used to render Hindi or English from the `lang` attribute. The product
 * decision changed: the videos stay Hinglish, the interface does not. Rather
 * than touch a hundred and sixty call sites at once, the component now returns
 * the English string and ignores the Hindi one, so the switch was a single
 * edit and the remaining `hi` props can be cleaned out as files are revisited.
 *
 * New code should not use this. Write the English string directly.
 *
 * @deprecated Write English text inline instead.
 */
export function T({ en, className }: { hi?: string; en: string; className?: string }) {
  return className ? <span className={className}>{en}</span> : <>{en}</>;
}
