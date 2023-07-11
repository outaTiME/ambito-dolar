import React from 'react';

import { useSiteMetadata } from '../hooks/use-site-metadata';

export const Seo = ({ title, description, children }) => {
  const {
    title: defaultTitle,
    description: defaultDescription,
    twitterUsername,
  } = useSiteMetadata();
  const seo = {
    title: title || defaultTitle,
    description: description || defaultDescription,
    twitterUsername,
  };
  return (
    <>
      <html lang="es" />
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="og:title" content={seo.title} />
      <meta name="og:description" content={seo.description} />
      <meta name="og:type" content="website" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:creator" content={seo.twitterUsername} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      {children}
    </>
  );
};
