import Host from './Host';
export default class User {
    public static instance(): User {
        if (!window.userInstance) {
            window.userInstance = new User();
        }
        return window.userInstance;
    }

    public generateUserIdByBaseUrl(userId: string, baseUrl: string, orgId?: string): string {
        const hsName = Host.instance().getHsNameByBaseUrl(baseUrl);
        return this.generateUserIdByHsName(userId, hsName, orgId);
    }

    public generateUserIdByHsName(userId: string, hsName: string, orgId?: string): string {
        if (!orgId) return this.generateUserId(userId, hsName);

        const hsNamePrefix = Host.instance().getHsNamePrefixByHsName(hsName);
        return this.generateUserIdByOrgId(userId, hsNamePrefix, orgId);
    }

    public generateUserIdByOrgId(userId: string, hsNamePrefix: string, orgId: string): string {
        return this.generateUserId(userId, `${hsNamePrefix}.${orgId}`);
    }

    public generateUserId(userId: string, hsName: string): string {
        return `@${userId}:${hsName}`
    }
}

