import { MatrixClientPeg } from "../MatrixClientPeg";

// 存储备份密钥
export function storeRecoveryKey(key): Promise<{}> {
    const cli = MatrixClientPeg.get();
    return cli.setAccountData('m.secret_storage.backup_key', {
        key
    });
}

// 获取idb里存储的备份密钥
export function getRecoveryKeyFromStore(): string {
    const cli = MatrixClientPeg.get();
    return cli.getAccountData('m.secret_storage.backup_key')?.getContent?.()?.key;
}

// 获取服务端存储的备份密钥
export function getRecoveryKeyFromServer(): Promise<{ [k: string]: any; }> {
    const cli = MatrixClientPeg.get();
    return cli.getAccountDataFromServer('m.secret_storage.backup_key');
}
