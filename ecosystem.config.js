module.exports = {
  apps: [
    {
      name: "survey-app",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      cwd: "/opt/survey",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      max_memory_restart: "500M",
      error_file: "/opt/survey/logs/error.log",
      out_file: "/opt/survey/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
