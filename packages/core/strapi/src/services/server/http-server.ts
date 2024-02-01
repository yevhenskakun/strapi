import http from 'http';
import https from 'https';

import type { Socket } from 'net';
import Koa from 'koa';
import type { Strapi } from '@strapi/types';

export interface Server extends http.Server {
  destroy: () => Promise<void>;
}

const createHTTPServer = (strapi: Strapi, koaApp: Koa): Server => {
  const connections = new Set<Socket>();

  // lazy creation of the request listener
  let handler: http.RequestListener;
  const listener: http.RequestListener = function handleRequest(req, res) {
    if (!handler) {
      handler = koaApp.callback();
    }

    return handler(req, res);
  };

  let server: http.Server | https.Server;
  if (strapi.config.get<http.ServerOptions>('server.https.serverOptions')) {
    const options = strapi.config.get<https.ServerOptions>('server.https.serverOptions', {});
    console.log(`using https server`);
    server = https.createServer(options, listener);
  } else {
    const options = strapi.config.get<http.ServerOptions>('server.http.serverOptions', {});
    console.log(`using http server`);
    server = http.createServer(options, listener);
  }

  server.on('connection', (connection) => {
    connections.add(connection);

    connection.on('close', () => {
      connections.delete(connection);
    });
  });

  // handle port in use cleanly
  server.on('error', (err) => {
    if ('code' in err && 'port' in err && err.code === 'EADDRINUSE') {
      return strapi.stopWithError(`The port ${err.port} is already used by another application.`);
    }

    strapi.log.error(err);
  });

  const destroy = async () => {
    for (const connection of connections) {
      connection.destroy();

      connections.delete(connection);
    }

    if (!server.listening) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  };

  return Object.assign(server, { destroy });
};

export { createHTTPServer };
