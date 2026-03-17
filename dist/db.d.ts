export declare function createImagesTable(db: Database): Promise<void>;
export declare function getLocalImagePath(db: Database, plexUrl: string): Promise<string | null>;
export declare function insertImage(db: Database, plexUrl: string, localPath: string): Promise<void>;
export declare function processPendingNotifications(db: Database, sendNotification: (userId: string, notification: any) => Promise<void>): Promise<void>;
export declare function addUserToNotify(db: Database, serverId: string, userId: string): Promise<void>;
export declare function removeUserToNotify(db: Database, serverId: string, userId: string): Promise<void>;
export declare function shouldNotifyUser(db: Database, serverId: string, userId: string): Promise<boolean>;
export declare function migratePendingNotificationsGuidAndIdMedia(db: Database): Promise<void>;
import { Database } from 'sqlite';
export declare function initDatabase(): Promise<Database>;
export declare function insertPendingNotification(db: Database, data: any): Promise<void>;
export declare function showExists(db: Database, guid: string, id_media?: string): Promise<boolean>;
export declare function insertShowIfNotExists(db: Database, metadata: any): Promise<void>;
//# sourceMappingURL=db.d.ts.map