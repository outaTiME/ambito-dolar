import React from 'react';

export default (fetchData, interval) => {
  const [data, setData] = React.useState({});
  const [error, setError] = React.useState({});
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    async function runFetch() {
      setIsLoading(true);
      try {
        const result = await fetchData();
        setData(result.data);
      } catch (err) {
        setError(err);
      }
      setIsLoading(false);
    }
    runFetch();
    const id = window.setInterval(runFetch, interval);
    return () => window.clearInterval(id);
  }, []);

  return { data, error, isLoading };
};
