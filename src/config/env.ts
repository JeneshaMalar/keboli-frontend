/**
 * Type-safe environment variables.
 * Add new VITE_ vars here as the project grows.
 */
export const ENV = {
    API_URL: import.meta.env.VITE_API_URL as string,
} as const;
