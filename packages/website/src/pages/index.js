import { useStaticQuery, graphql } from 'gatsby';
import React from 'react';
import { IconContext } from 'react-icons';
import {
  FaTwitter as Twitter,
  FaTelegramPlane as Telegram,
  FaInstagram as Insta,
  FaFacebook as Facebook,
  // FaTumblr as Tumblr,
  FaRedditAlien as Reddit,
  FaGithub as Github,
  FaEnvelope as Mail,
} from 'react-icons/fa';

import AppStore from '../components/app-store';
import Icon from '../components/icon';
import Layout from '../components/layout';
import Phone from '../components/phone';
import PlayStore from '../components/play-store';

const IndexPage = () => {
  const { site } = useStaticQuery(
    graphql`
      query {
        site {
          siteMetadata {
            title
            description
            author
          }
        }
      }
    `
  );
  const title = `${site.siteMetadata.title}`;
  React.useEffect(() => {
    document
      .getElementsByClassName('app-store')[0]
      .addEventListener('click', (event) => {
        window.open(
          'https://apps.apple.com/app/id1485120819',
          '_blank',
          'noopener'
        );
      });
    document
      .getElementsByClassName('play-store')[0]
      .addEventListener('click', (event) => {
        window.open(
          'https://play.google.com/store/apps/details?id=im.outa.AmbitoDolar',
          '_blank',
          'noopener'
        );
      });
  }, []);
  return (
    <IconContext.Provider
      value={{ style: { verticalAlign: 'middle' }, size: '18px' }}
    >
      <Layout>
        <div className="container">
          <div className="features">
            <div className="feature__item">
              <div className="row">
                <div className="col-6">
                  <div className="feature__content">
                    <div className="feature__icon">
                      <Icon />
                    </div>
                    <h2>{title}</h2>
                    <p>
                      Conocé las distintas cotizaciones de la divisa
                      norteamericana en la Argentina de manera simple, elegante
                      y efectiva.
                    </p>
                    <p className="social">
                      <a
                        className="icon"
                        href="https://twitter.com/AmbitoDolar"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Twitter />
                      </a>
                      <a
                        className="icon"
                        href="https://t.me/AmbitoDolar"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Telegram />
                      </a>
                      <a
                        className="icon"
                        href="https://instagram.com/ambitodolar"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Insta />
                      </a>
                      <a
                        className="icon"
                        href="https://fb.me/AmbitoDolar"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Facebook />
                      </a>
                      <a
                        className="icon"
                        href="https://www.reddit.com/r/AmbitoDolar"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Reddit />
                      </a>
                      {/* <a
                        className="icon"
                        href="https://cafecito.app/ambitodolar"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Cafecito />
                      </a> */}
                      <a
                        className="icon"
                        href="https://github.com/outaTiME/ambito-dolar"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github />
                      </a>
                      <a
                        className="icon"
                        href="mailto:soporte@ambito-dolar.app"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Mail />
                      </a>
                    </p>

                    <p className="donation">
                      Esta aplicación es gratuita y de código abierto, podes
                      contribuir con su desarrollo y mantenimiento haciendo tu
                      aporte en&nbsp;
                      <a
                        className="icon"
                        href="https://cafecito.app/ambitodolar"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Cafecito App
                      </a>
                      .
                    </p>

                    <div className="feature__action">
                      <AppStore />
                      <PlayStore />
                    </div>
                  </div>
                </div>
                <div className="col-6 first">
                  <Phone />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </IconContext.Provider>
  );
};

export default IndexPage;
