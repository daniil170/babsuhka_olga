import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import sendNewsletterHandler from './api/sendNewsletter.js';

function vercelApiDevPlugin() {
  return {
    name: 'vercel-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url === '/api/sendNewsletter' || req.url.startsWith('/api/sendNewsletter?'))) {
          const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
          process.env.RESEND_API_KEY = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
          let body = {};
          if (req.method === 'POST') {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const data = Buffer.concat(buffers).toString();
            try {
              body = data ? JSON.parse(data) : {};
            } catch (e) {
              body = {};
            }
          }
          const mockReq = {
            method: req.method,
            body,
            headers: req.headers
          };
          const mockRes = {
            statusCode: 200,
            headers: {},
            setHeader(name, val) {
              res.setHeader(name, val);
              this.headers[name] = val;
            },
            status(code) {
              this.statusCode = code;
              res.statusCode = code;
              return this;
            },
            json(data) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            },
            end(data) {
              res.end(data);
            }
          };

          try {
            await sendNewsletterHandler(mockReq, mockRes);
          } catch (err) {
            console.error('Dev API middleware error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, errors: [err.message] }));
          }
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [vercelApiDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
