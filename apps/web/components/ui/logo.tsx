import React from "react";

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * ConnectMe Brand Logo
 * Represents unified multi-channel messaging and connected conversation nodes.
 */
export default function Logo({ className = "h-4 w-4", size, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.5 4C3.11929 4 2 5.11929 2 6.5V16C2 17.3807 3.11929 18.5 4.5 18.5H6V21.25C6 21.8488 6.70274 22.1738 7.15806 21.7853L10.978 18.5H19.5C20.8807 18.5 22 17.3807 22 16V6.5C22 5.11929 20.8807 4 19.5 4H4.5ZM7.5 10C6.67157 10 6 10.6716 6 11.5C6 12.3284 6.67157 13 7.5 13H16.5C17.3284 13 18 12.3284 18 11.5C18 10.6716 17.3284 10 16.5 10H7.5ZM9 8C9 7.44772 9.44772 7 10 7H14C14.5523 7 15 7.44772 15 8C15 8.55228 14.5523 9 14 9H10C9.44772 9 9 8.55228 9 8Z"
        fill="currentColor"
      />
    </svg>
  );
}
