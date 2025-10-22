import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth' // This makes it scroll smoothly instead of instantly
    });
  }, [pathname]); // Runs every time the route changes

  return null;
};

export default ScrollToTop;