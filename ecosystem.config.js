/* eslint-disable quotes */
module.exports = {
  apps: [
    {
      name: 'onisad-sales-assist',
      script: 'app.js',

      // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/

      // Args for script for pm2 run forever
      // Current directory on server
      cwd: '/var/www/onisad-sales-assist/current',
      // Config out file for web errors
      error_file: '/var/www/onisad-sales-assist/logs/web.err.log',
      // Config out file for web logs
      out_file: '/var/www/onisad-sales-assist/logs/web.out.log',
      // Enable or disable auto restart after process failure
      autorestart: true,
      // Enable or disable the watch mode
      watch: false,
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
  deploy: {
    dev: {
      host: '192.168.8.115',
      user: 'debprox',
      ref: 'origin/main',
      repo: 'git@github.com:Onisad/onisad-sales-assist',
      path: '/var/www/onisad-sales-assist',
      'pre-deploy': 'git fetch && git reset --hard origin/main',
      'post-deploy': 'npm install && pm2 startOrRestart ecosystem.config.js',
    },
  },
};
