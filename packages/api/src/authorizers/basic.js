export const handler = (event) => {
  const isAuthorized = event?.headers?.authorization === process.env.SECRET_KEY;
  return {
    isAuthorized,
    context: {
      // pass,
    },
  };
};
