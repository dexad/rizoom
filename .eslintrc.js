module.exports = {
	extends: [
		require.resolve('@vercel/style-guide/eslint/browser'),
		'plugin:prettier/recommended',
	],
	plugins: ['simple-import-sort'],
};
