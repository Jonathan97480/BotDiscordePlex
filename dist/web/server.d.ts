import 'express-session';
declare module 'express-session' {
    interface SessionData {
        user?: string;
        mp?: string;
    }
}
//# sourceMappingURL=server.d.ts.map