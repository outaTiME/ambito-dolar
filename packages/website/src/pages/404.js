import React from 'react';

import Layout from '../components/layout';
import SEO from '../components/seo';

const NotFoundPage = () => (
  <Layout>
    <SEO title="404: Not found" />
    <div className="container">
      <h1>¡UPS!</h1>
      <p>Lo sentimos, pero esta pagina no esta disponible.</p>
    </div>
  </Layout>
);

export default NotFoundPage;
