/**
 * The dev proxy of `ng serve`: /api, /healthz and /events go to the API on port 8080.
 * Dev only. The production build and the NestJS server do not read this file.
 */
const API_TARGET = 'http://127.0.0.1:8080';

/**
 * Vite's proxy pipes the upstream /events response into the browser's response and never ends it
 * when the API stops (the API destroys its streams on shutdown). This hook destroys the browser's
 * response when the upstream response closes, errors or aborts, so the EventSource fires an error
 * and reconnects. A response that has already ended is left alone.
 */
function endStreamWhenUpstreamEnds(proxy) {
  proxy.on('proxyRes', (proxyRes, _req, res) => {
    const end = () => {
      if (!res.writableEnded) {
        res.destroy();
      }
    };
    proxyRes.on('close', end);
    proxyRes.on('error', end);
    proxyRes.on('aborted', end);
  });
}

export default {
  '/api': { target: API_TARGET },
  '/healthz': { target: API_TARGET },
  '/events': { target: API_TARGET, configure: endStreamWhenUpstreamEnds },
};
