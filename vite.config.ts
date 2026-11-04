import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import nodeAdapter from '@sveltejs/adapter-node';
import vercelAdapter from '@sveltejs/adapter-vercel';
export default defineConfig({ plugins: [tailwindcss(), sveltekit({ adapter: process.env.VERCEL ? vercelAdapter({ runtime: 'nodejs24.x', maxDuration: 60 }) : nodeAdapter() })] });
