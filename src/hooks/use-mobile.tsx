import * as React from "react";

const MOBILE_BREAKPOINT = 768; // md breakpoint for mobile
const TABLET_BREAKPOINT = 1024; // lg breakpoint for tablet

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const checkIsTablet = () => {
      const width = window.innerWidth;
      return width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
    };
    
    const onChange = () => {
      setIsTablet(checkIsTablet());
    };
    
    window.addEventListener("resize", onChange);
    setIsTablet(checkIsTablet());
    return () => window.removeEventListener("resize", onChange);
  }, []);

  return !!isTablet;
}

export function useDeviceType() {
  const [deviceType, setDeviceType] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  React.useEffect(() => {
    const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
      const width = window.innerWidth;
      if (width < MOBILE_BREAKPOINT) return 'mobile';
      if (width < TABLET_BREAKPOINT) return 'tablet';
      return 'desktop';
    };
    
    const onChange = () => {
      setDeviceType(getDeviceType());
    };
    
    window.addEventListener("resize", onChange);
    setDeviceType(getDeviceType());
    return () => window.removeEventListener("resize", onChange);
  }, []);

  return deviceType;
}
