// PM2 ecosystem config for the Momentum game server
// Usage on the VPS:
//   pm2 start ecosystem.config.cjs
//   pm2 save
//   pm2 startup    # to enable auto-start on reboot
module.exports = {
  apps: [
    {
      name: "momentum-server",
      script: "dist/index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork", // Colyseus does NOT support cluster mode out of the box
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
      // .env file is loaded via `dotenv/config` in src/index.ts
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
