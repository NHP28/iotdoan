module.exports = {
  apps: [{
    name: 'iot-driver-fe',
    cwd: __dirname,
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3001',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    env: { NODE_ENV: 'production' },
  }],
};
