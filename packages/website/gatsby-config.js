module.exports = {
  siteMetadata: {
    title: 'Ámbito Dólar',
    description:
      'Cotizaciones de las principales divisas en Argentina al instante.',
    twitterUsername: '@outa7iME',
    siteUrl: 'https://ambito-dolar.app',
  },
  plugins: [
    'gatsby-plugin-image',
    {
      resolve: 'gatsby-plugin-sharp',
      options: {
        defaults: {
          quality: 100,
        },
      },
    },
    {
      resolve: 'gatsby-plugin-sass',
      options: {
        sassOptions: {
          silenceDeprecations: ['legacy-js-api', 'import'],
        },
      },
    },
    {
      resolve: 'gatsby-omni-font-loader',
      options: {
        preconnect: ['https://fonts.googleapis.com'],
        web: [
          {
            name: 'Fira Sans',
            file: 'https://fonts.googleapis.com/css2?family=Fira+Sans&display=swap',
          },
        ],
      },
    },
    {
      resolve: 'gatsby-plugin-manifest',
      options: {
        name: 'Ámbito Dólar',
        start_url: '/',
        theme_color: '#00AE6B',
        icon: './static/images/icon.png',
      },
    },
    'gatsby-plugin-sitemap',
    'gatsby-plugin-robots-txt',
    {
      resolve: 'gatsby-plugin-humans-txt',
      options: {
        // remove warning on build
        metaTag: false,
        team: [
          {
            Developer: 'Ariel Falduto',
            GitHub: 'outaTiME',
            Twitter: '@outa7iME',
          },
        ],
      },
    },
    {
      resolve: 'gatsby-plugin-google-gtag',
      options: {
        trackingIds: ['G-HY1K54SWGZ'],
      },
    },
    'gatsby-plugin-no-sourcemaps',
  ],
};
