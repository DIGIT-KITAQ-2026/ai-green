/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    // 「マニュアル」は「業務内容」に統合したため、旧URLは業務内容へ送る。
    return [
      { source: "/manual", destination: "/tasks", permanent: false },
      { source: "/manual/new", destination: "/tasks/new", permanent: false },
      { source: "/manual/:id", destination: "/tasks/:id", permanent: false },
    ];
  },
};

export default nextConfig;
