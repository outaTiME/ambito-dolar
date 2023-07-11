import { StaticImage } from 'gatsby-plugin-image';
import React from 'react';

const AppStore = () => (
  <StaticImage
    alt=""
    src="../../static/images/app-store.png"
    layout="fixed"
    height={40}
    className="app-store"
  />
);
export default AppStore;
