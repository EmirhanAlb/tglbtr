import { useId } from "react";

export function LiquidButton({
  children,
  size = "lg",
  className = "",
  onClick,
  type = "button",
  ...rest
}) {
  const filterId = useId().replace(/:/g, "");
  const filterUrl = `url(#liquid-${filterId})`;

  return (
    <button
      type={type}
      onClick={onClick}
      className={`liquid-btn liquid-btn-${size} ${className}`}
      {...rest}
    >
      <span className="liquid-btn-glass" aria-hidden="true" />
      <span className="liquid-btn-distort" aria-hidden="true" style={{ backdropFilter: filterUrl, WebkitBackdropFilter: filterUrl }} />
      <span className="liquid-btn-text">{children}</span>
      <svg className="liquid-btn-filter" aria-hidden="true">
        <defs>
          <filter
            id={`liquid-${filterId}`}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
            <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
            <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="70" xChannelSelector="R" yChannelSelector="B" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
            <feComposite in="finalBlur" in2="finalBlur" operator="over" />
          </filter>
        </defs>
      </svg>
    </button>
  );
}
