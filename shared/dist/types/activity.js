// shared/types/activity.ts
export class ActivityError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'ActivityError';
    }
}
