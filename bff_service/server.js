const Fastify = require('fastify');
const axios = require('axios');
const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

const fastify = Fastify({ logger: true });
const agent = new https.Agent({
  rejectUnauthorized: false,
  secureProtocol: 'TLSv1_2_method',
});

const requestHandler = async (request, reply) => {
  const { serviceName, id } = request.params;
  const recipientURL = process.env[serviceName];
  console.log('recipientURL', recipientURL);
  if (!recipientURL) {
    return reply.status(502).send({ error: 'Cannot process request' });
  }

  try {
    const targetURL = `${recipientURL}${request.url}`;
    console.log('targetURL', targetURL);
    let headers = request.headers;
    console.log('request.headers', request.headers);
    if (recipientURL.includes('https')) {
      headers = {
        'Content-Type': request.headers['content-type'],
        'Accept': request.headers['accept'],
        'Authorization': request.headers['authorization'],
      };
    }
    console.log('headers', headers);
    const response = await axios({
      method: request.method,
      url: targetURL,
      headers: headers,
      params: request.query,
      data: request.body,
      // httpsAgent: agent,
    });

    console.log('response.headers', response.headers);
    reply.status(response.status).headers(headers).send(response.data);
  } catch (err) {
    console.error('Error:', err);
    console.error('Error response:', err.response);
    const status = err.response?.status || 500;
    const message = err.response?.data || { error: 'Unknown error' };
    reply.status(status).send(message);
  }
}

fastify.all('/:serviceName/:id', requestHandler);
fastify.all('/:serviceName', requestHandler);

// fastify.listen({ port: 3000, host: '0.0.0.0' });
fastify.listen({ port: 3000, host: 'localhost' });