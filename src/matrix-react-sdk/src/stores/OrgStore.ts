/*
Copyright 2020 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
export interface OrgItem {
    id: string,
    name: string,
    alias: string,
    description: string,
    create_time: string,
    update_time: string
}
export interface IOrg {
    orgList: OrgItem[];
    currentOrgId: string;
}

export default class OrgStore {
    private orgList: OrgItem[] = [];
    private currentOrgId: string = '';

    private constructor() {
        const mxUserId = localStorage.getItem("mx_user_id");
        this.currentOrgId = mxUserId.split(":")[1]?.split('.')[1];
    }

    public static sharedInstance(): OrgStore {
        if (!window.mxOrgStore) window.mxOrgStore = new OrgStore();
        return window.mxOrgStore;
    }

    // 请求组织列表
    public queryOrgList(): Promise<OrgItem[]> {
        return fetch(`/heliumos-org-api/v1/pubcc/organizations`)
            .then((response) => response.json())
            .then((res) => {
                return res.data || [];
            });
    }

    // 获取组织列表
    public getOrgList(): OrgItem[] {
        return this.orgList;
    }

    // 设置组织列表
    public setOrgList(orgList: OrgItem[]): void {
       this.orgList = orgList;
    }

    // 获取当前用户所在组织id
    public getCurrentOrgId(): string {
        return this.currentOrgId;
    }

    // 获取当前用户所在组织别名
    public getCurrentOrgAlias(): string {
        return this.getOrgAliasById(this.currentOrgId);
    }

    // 获取当前用户所在组织名称
    public getCurrentOrgName(): string {
        return this.getOrgNameById(this.currentOrgId);
    }

    // 根据组织id获取组织信息
    public getOrgInfoById(id: string): OrgItem {
        return this.orgList.find(item => item.id === id);
    }

    // 根据组织id获取组织别名
    public getOrgAliasById(id: string): string {
        return this.getOrgInfoById(id)?.alias || '';
    }

    // 根据组织id获取组织名称
    public getOrgNameById(id: string): string {
        return this.getOrgInfoById(id)?.name || '';
    }

    // 根据组织别名获取组织信息
    public getOrgInfoByAlias(alias: string): OrgItem {
        return this.orgList.find(item => item.alias === alias);
    }

    // 根据组织别名获取组织id
    public getOrgIdByAlias(alias: string): string {
        return this.getOrgInfoByAlias(alias)?.id || '';
    }

    // 根据组织别名获取组织名称
    public getOrgNameByAlias(alias: string): string {
        return this.getOrgInfoByAlias(alias)?.name || '';
    }

    // 根据组织名称获取组织信息
    public getOrgInfoByName(name: string): OrgItem {
        return this.orgList.find(item => item.name === name);
    }

    // 根据组织名称获取组织id
    public getOrgIdByName(name: string): string {
        return this.getOrgInfoByName(name)?.id || '';
    }

    // 根据组织名称获取组织别名
    public getOrgAliasByName(name: string): string {
        return this.getOrgInfoByName(name)?.alias || '';
    }
}
