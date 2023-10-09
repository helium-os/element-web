type Roles = string[];
export default class UserStore {
    roles: Roles = [];

    public static instance(): UserStore {
        if (!window.userInstance) {
            window.mxUserStore = new UserStore();
        }
        return window.mxUserStore;
    }

    public setUserRoles(roles: Roles) {
        this.roles = roles;
    }

    public get isAdmin(): boolean {
        console.log("user roles", this.roles);
        return this.roles.includes("admin");
    }
}
