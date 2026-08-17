module.exports = {
	apps: [{
		name: 'restobox',
		script: 'npm',
		args: 'start',
		cwd: __dirname,
		env: {
			NODE_ENV: 'production',
		},
		autorestart: true,
		max_memory_restart: '750M',
		time: true,
	}],
};
