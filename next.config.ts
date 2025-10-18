import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import packageJson from './package.json';

// Skip Cloudflare initialization when building in Docker
if (process.env.DOCKER_BUILD !== 'true') {
  // Used by opennextjs/cloudflare to allow local development with Cloudflare bindings
  initOpenNextCloudflareForDev();
}

const nextConfig = {
  env: {
    VERSION: packageJson.version,
  },
  // Enable standalone output for Docker
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
};

export default nextConfig;
