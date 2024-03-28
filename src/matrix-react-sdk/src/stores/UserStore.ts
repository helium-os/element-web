export type Roles = string[];
export default class UserStore {
    roles: Roles = [];

    public static instance(): UserStore {
        if (!window.mxUserStore) {
            window.mxUserStore = new UserStore();
        }
        return window.mxUserStore;
    }

    public setUserRoles(roles: Roles) {
        this.roles = roles;
    }

    // 是否是组织的管理员
    public get isOrgAdmin(): boolean {
        console.log("user roles", this.roles);
        return this.roles.includes("admin");
    }

    // 判断当前用户是否拥有新建社区的权限
    public get canCreateSpace(): boolean {
        return !!this.isOrgAdmin;
    }
}
