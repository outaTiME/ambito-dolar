import React from 'react';

import Layout from '../components/layout';
import { Seo } from '../components/seo';

const NotFoundPage = () => (
  <Layout>
    <div className="container">
      <h1>¡UPS!</h1>
      <p>Lo sentimos, pero esta pagina no esta disponible.</p>
    </div>
  </Layout>
);

export default NotFoundPage;

export const Head = () => <Seo title="404: Not found" />;
