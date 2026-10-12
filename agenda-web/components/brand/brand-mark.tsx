import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  showWord?: boolean;
  wordClassName?: string;
};

const iconSize = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

const wordSize = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-4xl",
} as const;

export function BrandMark({
  href = "/",
  size = "md",
  showWord = true,
  wordClassName,
}: BrandMarkProps) {
  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/lillo-192.png"
        alt=""
        width={56}
        height={56}
        className={`${iconSize[size]}`}
      />
      {showWord ? (
        <span className={`leading-none ${wordSize[size]} ${wordClassName ?? "brand-word"}`}>
          Lillo
        </span>
      ) : null}
    </>
  );

  if (!href) {
    return (
      <span className="inline-flex items-center gap-2.5" aria-label="Lillo">
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="Lillo">
      {content}
    </Link>
  );
}
