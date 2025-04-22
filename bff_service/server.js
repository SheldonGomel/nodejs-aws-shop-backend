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

const cache = new Map(); // In-memory cache
const CACHE_TTL = 120000; // Cache TTL in milliseconds (e.g., 120 seconds)

const requestHandler = async (request, reply) => {
  const { serviceName, id } = request.params;
  const recipientURL = process.env[serviceName];
  console.log('recipientURL', recipientURL);
  if (!recipientURL) {
    return reply.status(502).send({ error: 'Cannot process request' });
  }

  try {
    const targetURL = `${recipientURL}${request.url}`;
    const authHeader = request.headers['authorization'] || '';
    const cacheKey = `${targetURL}|${authHeader}`; // Composite key: URL + Authorization header

    
    let headers = request.headers;
    if (recipientURL.includes('https')) {
      headers = {
        'Content-Type': request.headers['content-type'],
        'Accept': request.headers['accept'],
        'Authorization': request.headers['authorization'],
        'Access-Control-Allow-Origin': request.headers['origin'],
      };
    }
    headers['Access-Control-Allow-Origin'] = request.headers['origin'];
    headers['Access-Control-Allow-Headers'] = request.headers['access-control-request-headers'];
    headers['Access-Control-Allow-Methods'] = request.headers['access-control-request-method'];
    // Check cache for GET requests to '/products'
    if (request.method === 'GET' && request.url === '/products') {
      console.log('cacheKey', cacheKey);
      const cachedEntry = cache.get(cacheKey);
      if (cachedEntry) {
        const { data, expiration } = cachedEntry;
        if (Date.now() < expiration) {
          console.log('Cache hit for', cacheKey);
          return reply.status(200).headers(headers).send(JSON.stringify(data));
        } else {
          console.log('Cache expired for', cacheKey);
          cache.delete(cacheKey); // Remove expired entry
        }
      } else {
        console.log('Cache miss for', cacheKey);
      }
    }
    const response = await axios({
      method: request.method,
      url: targetURL,
      headers: headers,
      params: request.query,
      data: request.body,
    });

    // Cache the response for GET requests to '/products'
    if (request.method === 'GET' && request.url === '/products') {
      cache.set(cacheKey, {
        data: response.data,
        expiration: Date.now() + CACHE_TTL, // Set expiration time
      });
      console.log('Response cached for', cacheKey);
    }

    reply.status(response.status).headers(headers).send(JSON.stringify(response.data));
  } catch (err) {
    console.error('Error:', err);
    console.error('Error response:', err.response);
    const status = err.response?.status || 500;
    const message = err.response?.data || { error: 'Unknown error' };
    reply.status(status).send(message);
  }
};

const healthHandler = async (request, reply) => {
  const cartURL = process.env.cart;
  const productsURL = process.env.products;
  const orderURL = process.env.order;
  if (!cartURL || !productsURL || !orderURL) {
    return reply.status(500).send({ error: 'Environment vars is not defined' });
  }
  reply.status(200).send({ health: 'ok' });
}

fastify.get('/', healthHandler);
fastify.all('/:serviceName/:id', requestHandler);
fastify.all('/:serviceName', requestHandler);

fastify.listen({ port: 3000, host: '0.0.0.0' });
// fastify.listen({ port: 3000, host: 'localhost' });