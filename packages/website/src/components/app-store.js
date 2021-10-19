import { StaticQuery, graphql } from 'gatsby';
import Img from 'gatsby-image';
import React from 'react';

/*
 * This component is built using `gatsby-image` to automatically serve optimized
 * images with lazy loading and reduced file sizes. The image is loaded using a
 * `StaticQuery`, which allows us to load the image from directly within this
 * component, rather than having to pass the image data down from pages.
 *
 * For more information, see the docs:
 * - `gatsby-image`: https://gatsby.dev/gatsby-image
 * - `StaticQuery`: https://gatsby.dev/staticquery
 */

const AppStore = () => (
  <StaticQuery
    query={graphql`
      query {
        placeholderImage: file(relativePath: { eq: "app-store.png" }) {
          childImageSharp {
            fluid(maxHeight: 40) {
              ...GatsbyImageSharpFluid_withWebp
              ...GatsbyImageSharpFluidLimitPresentationSize
            }
          }
        }
      }
    `}
    render={(data) => (
      <Img
        fluid={data.placeholderImage.childImageSharp.fluid}
        className="app-store"
        imgStyle={{ borderRadius: '8px' }}
      />
    )}
  />
);
export default AppStore;
