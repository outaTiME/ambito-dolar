import AmbitoDolar from '@ambito-dolar/core';

export const publish = async (caption, file) => {
  try {
    const media = file && `data:image/jpeg;base64,${file.toString('base64')}`;
    const uri = `https://gate.whapi.cloud/messages/${media ? 'image' : 'text'}`;
    const {
      message: { id, type },
    } = await AmbitoDolar.fetch(uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${process.env.WHAPI_TOKEN}`,
      },
      body: JSON.stringify({
        to: process.env.WHATSAPP_CHANNEL_ID,
        ...(media ? { media, caption } : { body: caption }),
      }),
    }).then((response) => response.json());
    return {
      id,
      type,
    };
  } catch (error) {
    /* console.error(
      'Unable to publish to whatsapp',
      JSON.stringify({ error: error.message })
    ); */
    // unhandled error
    throw error;
  }
};
