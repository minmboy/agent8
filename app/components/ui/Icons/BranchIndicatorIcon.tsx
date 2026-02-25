import React from 'react';

interface BranchIndicatorIconProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  fill?: string;
  fillOpacity?: string | number;
}

export const BranchIndicatorIcon: React.FC<BranchIndicatorIconProps> = ({
  className = '',
  width = 32,
  height = 24,
  fill = 'white',
  fillOpacity = 0.12,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 32 24"
      fill="none"
      className={className}
    >
      <g clipPath="url(#clip0_10232_6345)">
        <mask
          id="mask0_10232_6345"
          style={{ maskType: 'luminance' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="32"
          height="24"
        >
          <path d="M32 0H0V24H32V0Z" fill="white" />
        </mask>
        <g mask="url(#mask0_10232_6345)">
          <path
            d="M8.1543 -0.749023C10.1003 4.35915 12.8602 7.32618 16.6641 9.0498C20.5178 10.796 25.5118 11.2998 32 11.2998V12.7002C25.4882 12.7002 20.2322 12.204 16.0859 10.3252C11.8899 8.42384 8.89967 5.14069 6.8457 -0.250977L8.1543 -0.749023Z"
            fill={fill}
            fillOpacity={fillOpacity}
          />
        </g>
      </g>
      <defs>
        <clipPath id="clip0_10232_6345">
          <rect width="32" height="24" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
