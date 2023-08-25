
interface HsInfo {
    prefix: string;
    orgId: string;
}
export default class Host {
    public static instance(): Host {
        if (!window.hostInstance) {
            window.hostInstance = new Host();
        }
        return window.hostInstance;
    }

    public getHsNameByBaseUrl(baseUrl: string): string {
        return new URL(baseUrl)?.hostname;
    }

    public getHsNamePrefixByBaseUrl(baseUrl: string): string {
        const hsName = this.getHsNameByBaseUrl(baseUrl);
        return this.getHsNamePrefixByHsName(hsName);
    }

    public getHsNamePrefixByHsName(hsName: string): string {
        return this.getHsInfoByHsName(hsName)?.prefix;
    }

    public getHsInfoByHsName(hsName: string): HsInfo {
        const hsNameArr = hsName.split('.');
        const [orgId] = hsNameArr.splice(-1, 1);
        return {
            prefix: hsNameArr.join('.'),
            orgId
        }
    }
}

