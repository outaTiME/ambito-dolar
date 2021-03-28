import { StaticQuery, graphql } from 'gatsby';
import Img from 'gatsby-image';
import { ThemeToggler } from 'gatsby-plugin-dark-mode';
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

const Phone = () => (
  <StaticQuery
    query={graphql`
      query {
        lightImage: file(relativePath: { eq: "iphone.png" }) {
          childImageSharp {
            fluid(maxWidth: 300) {
              ...GatsbyImageSharpFluid_withWebp
              ...GatsbyImageSharpFluidLimitPresentationSize
            }
          }
        }
        darkImage: file(relativePath: { eq: "iphone-dark.png" }) {
          childImageSharp {
            fluid(maxWidth: 300) {
              ...GatsbyImageSharpFluid_withWebp
              ...GatsbyImageSharpFluidLimitPresentationSize
            }
          }
        }
      }
    `}
    render={(data) => (
      <ThemeToggler>
        {({ theme }) => {
          // Don't render anything at compile time. Deferring rendering until we
          // know which theme to use on the client avoids incorrect initial
          // state being displayed.
          if (theme == null) {
            return null;
          }
          return (
            <Img
              fluid={
                data[theme === 'dark' ? 'darkImage' : 'lightImage']
                  .childImageSharp.fluid
              }
              style={{
                margin: `0 auto`,
              }}
              imgStyle={{ objectFit: 'contain' }}
            />
          );
        }}
      </ThemeToggler>
    )}
  />
);
export default Phone;
