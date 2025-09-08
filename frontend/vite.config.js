import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        allowedHosts: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true
            },
            '/socket.io': {
                target: 'http://localhost:8080',
                ws: true,
                changeOrigin:true
            }
        }
    }
});
