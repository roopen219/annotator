module.exports = {
    apps : [{
        name: 'annotator',
        script: 'index.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'development'
        },
        env_production: {
            NODE_ENV: 'production'
        }
    }],
    deploy : {
        production : {
            user : 'ec2-user',
            host : '13.126.247.97',
            ref  : 'origin/master',
            repo : 'git@github.com:roopen219/annotator.git',
            path : '/home/ec2-user/annotator',
            'post-deploy' : 'cd /home/ec2-user/annotator/current && npm install && pwd && pm2 reload ecosystem.config.js --env production --update-env'
        }
    }
};