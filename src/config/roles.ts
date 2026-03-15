export const ROLES = {
    ADMIN: 'admin',
    RECRUITER: 'recruiter',
    CANDIDATE: 'candidate',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
