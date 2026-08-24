// Split out from lib/upload-reward.ts specifically so client components can
// import these display constants without pulling in @/lib/prisma (server-
// only) through the rest of that module.
export const UPLOAD_REWARD_THRESHOLD = 3
export const UPLOAD_REWARD_CREDITS = 2
export const UPLOAD_REWARD_WINDOW_DAYS = 15
