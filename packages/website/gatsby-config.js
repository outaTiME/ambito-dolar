module.exports = {
  siteMetadata: {
    title: `Ámbito Dólar`,
    description: `Cotizaciones del dólar en Argentina al instante.`,
    author: `@outa7iME`,
    siteUrl: `https://ambito-dolar.app`,
  },
  plugins: [
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/static/images`,
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `Ámbito Dólar`,
        start_url: `/`,
        theme_color: `#00AE6B`,
        icon: `${__dirname}/static/images/icon.png`, // This path is relative to the root of the site.
      },
    },
    `gatsby-plugin-sass`,
    {
      resolve: `gatsby-plugin-web-font-loader`,
      options: {
        google: {
          families: [`Fira Sans`],
        },
      },
    },
    // this (optional) plugin enables Progressive Web App + Offline functionality
    // To learn more, visit: https://gatsby.dev/offline
    // `gatsby-plugin-offline`,
    `gatsby-plugin-no-sourcemaps`,
    `gatsby-plugin-dark-mode`,
    `gatsby-plugin-robots-txt`,
    {
      resolve: `gatsby-plugin-humans-txt`,
      options: {
        team: [
          {
            Developer: `Ariel Falduto`,
            GitHub: `outaTiME`,
            Twitter: `@outa7iME`,
          },
        ],
      },
    },
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: `UA-31782998-4`,
      },
    },
  ],
  flags: {
    DEV_SSR: false,
  },
};
