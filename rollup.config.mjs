import { resolve } from 'node:path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import postcssNested from 'postcss-nested';
import postcssImport from 'postcss-import';
import postcssPresetEnv from 'postcss-preset-env';
import livereload from 'rollup-plugin-livereload';

const isProduction = process.env.BUILD === 'production';

export default {
	input: 'js/rizoom.js',
	output: [
		{
			file: 'dist/rizoom.esm.js',
			format: 'esm',
		},
		{
			file: 'dist/rizoom.min.js',
			format: 'umd',
			name: 'Rizoom',
			plugins: [terser()],
		},
	],
	plugins: [
		nodeResolve(),
		commonjs(),
		postcss({
			extract: 'rizoom.min.css',
			sourceMap: true,
			minimize: true,
			plugins: [
				postcssNested(),
				postcssImport(),
				postcssPresetEnv({
					features: {
						'custom-properties': false,
					},
				}),
			],
		}),
		!isProduction &&
			livereload({
				watch: resolve('.'),
				exclusions: [resolve('node_modules')],
			}),
	],
};
