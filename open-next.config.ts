import type { OpenNextConfig } from '@opennextjs/cloudflare';

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      incrementalCache: async () => (await import('@opennextjs/cloudflare/kv-cache')).default,
      tagCache: async () => (await import('@opennextjs/cloudflare/d1-tag-cache')).default,
      queue: async () => (await import('@opennextjs/cloudflare/sqs-lite-queue')).default,
    },
  },
};

export default config;
