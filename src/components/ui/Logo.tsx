import Image from 'next/image';
import logoGold from '../../../public/images/logo-wordmark.png';
import logoInk from '../../../public/images/logo-wordmark-ink.png';

/**
 * The Genesis by Preethy wordmark — the same asset the storefront uses, kept in
 * both apps' `public/` so neither depends on the other's build.
 *
 * Two variants of one artwork:
 *   · `gold` — the brand mark, for dark grounds (the ink sidebar). ~7:1.
 *   · `ink`  — the same letterforms in soft-black, for ivory grounds (login).
 *              The gold reads at only ~2:1 on ivory and looks washed out.
 *
 * Trimmed from `Logo.png`, whose 1080×1080 canvas is 84% empty padding.
 */
export default function Logo({
  tone = 'ink',
  className = '',
  priority = false,
}: {
  tone?: 'gold' | 'ink';
  /** Set the height here; width follows the 2.99:1 aspect automatically. */
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={tone === 'gold' ? logoGold : logoInk}
      alt="Genesis by Preethy"
      priority={priority}
      className={`w-auto object-contain select-none ${className}`}
      sizes="220px"
    />
  );
}
