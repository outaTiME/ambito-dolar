import { StaticImage } from 'gatsby-plugin-image';
import React from 'react';

const Icon = () => (
  <StaticImage
    alt=""
    src="../../static/images/icon.png"
    layout="fixed"
    width={72}
    className="app-icon"
  />
);
export default Icon;
