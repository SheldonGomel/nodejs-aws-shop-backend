const Fastify = require('fastify');
const proxy = require('@fastify/http-proxy');
const dotenv = require('dotenv');
dotenv.config();

const fastify = Fastify({ logger: true });

const cartService = {
  host: process.env.cart,
};
const productService = {
  host: process.env.products,
};

fastify.register(proxy, {
  upstream: productService.host,
  prefix: '/products',
  httpMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  rewritePrefix: 'dev/products'
});

fastify.register(proxy, {
  upstream: cartService.host,
  prefix: '/cart',
  httpMethods: ['GET', 'PUT', 'DELETE'],
  rewritePrefix: 'api/profile/cart'
});

// fastify.listen({ port: 3000, host: "localhost" });
fastify.listen({ port: 3000, host: '0.0.0.0' });
