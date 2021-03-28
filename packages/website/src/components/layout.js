/**
 * Layout component that queries for data
 * with Gatsby's StaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/static-query/
 */

import { useStaticQuery, graphql } from 'gatsby';
import BackgroundImage from 'gatsby-background-image';
import PropTypes from 'prop-types';
import React from 'react';

import SEO from '../components/seo';

import '../../static/styles/main.scss';

const Layout = ({ children }) => {
  const { seamlessBackground } = useStaticQuery(
    graphql`
      query {
        seamlessBackground: file(
          relativePath: { eq: "seamless-background.jpg" }
        ) {
          childImageSharp {
            fluid(quality: 100, maxWidth: 1920) {
              ...GatsbyImageSharpFluid_withWebp
            }
          }
        }
      }
    `
  );
  return (
    <main>
      <SEO />
      <BackgroundImage
        fluid={seamlessBackground.childImageSharp.fluid}
        style={{
          // height: `100vh`,
          // width: `100vw`,
          // height: `100%`,
          width: `100%`,
          // backgroundColor: `transparent`,
          // backgroundSize: `auto`,
          backgroundPosition: `center center`,
          display: `flex`,
          alignItems: `center`,
          height: `auto`,
          minHeight: `100%`,
        }}
      >
        {children}
      </BackgroundImage>
    </main>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
