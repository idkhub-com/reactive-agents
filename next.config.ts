import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import packageJson from './package.json';

// Used by opennextjs/cloudflare to allow local development with Cloudflare bindings
initOpenNextCloudflareForDev();

const nextConfig = {
  env: {
    VERSION: packageJson.version,
  },
};

export default nextConfig;
