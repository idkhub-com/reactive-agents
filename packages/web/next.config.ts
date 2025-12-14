import packageJson from './package.json';

const nextConfig = {
  env: {
    VERSION: packageJson.version,
  },
  // Enable standalone output for Docker
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
  // Enable Cache Components for explicit opt-in caching
  cacheComponents: true,
};

export default nextConfig;
