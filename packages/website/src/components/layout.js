import PropTypes from 'prop-types';
import React from 'react';

import '../../static/styles/main.scss';

const Layout = ({ children }) => <main>{children}</main>;

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
