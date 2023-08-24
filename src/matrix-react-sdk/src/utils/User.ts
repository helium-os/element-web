
export default class User {
    public static instance(): User {
        if (!window.userInstance) {
            window.userInstance = new User();
        }
        return window.userInstance;
    }
    public generateUserIdByBaseUrl(userId: string, baseUrl: string): string {
        const hsName = new URL(baseUrl)?.hostname;
        return this.generateUserIdByHsName(userId, hsName);
    }

    public generateUserIdByHsName(userId: string, hsName: string): string {
        return `@${userId}:${hsName}`
    }
}

