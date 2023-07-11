import { usePrefersColorScheme } from '@anatoliygatt/use-prefers-color-scheme';
import { StaticImage } from 'gatsby-plugin-image';
import React from 'react';

const Phone = () => {
  const [domLoaded, setDomLoaded] = React.useState(false);
  const prefersColorScheme = usePrefersColorScheme();
  const isDarkMode = prefersColorScheme === 'dark';
  // wait for client-side hydration to render
  React.useEffect(() => {
    setDomLoaded(true);
  }, []);
  if (domLoaded) {
    if (isDarkMode) {
      return (
        <StaticImage
          alt=""
          src="../../static/images/iphone-dark.png"
          layout="constrained"
          width={300}
          placeholder="none"
        />
      );
    }
    return (
      <StaticImage
        alt=""
        src="../../static/images/iphone.png"
        layout="constrained"
        width={300}
        placeholder="none"
      />
    );
  }
};

export default Phone;
