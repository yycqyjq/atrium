export default function Skylight({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`shrink-0 ${className}`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        className="h-[132px] w-[132px]"
      >
        <rect x="10" y="10" width="180" height="180" />
        <rect x="45" y="45" width="110" height="110" />
        <rect x="80" y="80" width="40" height="40" />
        <path d="M100 10 V45 M100 155 V190 M10 100 H45 M155 100 H190" />
      </svg>
    </div>
  );
}
