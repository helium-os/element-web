import React, { memo, useState, useEffect, ChangeEvent } from "react";
import BaseDialog from "../BaseDialog";
import { _t } from "matrix-react-sdk/src/languageHandler";
import DialogButtons from "matrix-react-sdk/src/components/views/elements/DialogButtons";
import Field from "matrix-react-sdk/src/components/views/elements/Field";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import withValidation, {
    IFieldState,
    IValidationResult,
} from "matrix-react-sdk/src/components/views/elements/Validation";

export enum DialogType {
    Create,
    Edit,
}
interface IProps {
    type: DialogType;
    tagId?: string; // 分组id
    onFinished: () => void;
}

const validateGroupRoomName = withValidation({
    rules: [
        {
            key: "required",
            test: async ({ value }) => !!value,
            invalid: () => _t("Please enter a name for the group"),
        },
    ],
});
const GroupNameDialog: React.FC<IProps> = ({ type, tagId, onFinished }) => {
    const cli = MatrixClientPeg.get();
    const [busy, setBusy] = useState<boolean>(false);

    const [name, setName] = useState<string>("");
    const [groupNameValidate, setGroupNameValidate] = useState(false);

    // 初始化分组名称
    useEffect(() => {
        let name;
        switch (type) {
            case DialogType.Edit: {
                // 编辑时需要回显当前分组名称
                const tags = SpaceStore.instance.spaceTags;
                const match = tags.find((item) => item.tagId === tagId);
                name = match?.tagName || "";
                break;
            }
            case DialogType.Create:
            default:
                name = "";
        }
        setName(name);
    }, [type, tagId]);

    const onOk = async () => {
        if (busy) return;

        setBusy(true);
        try {
            await (type === DialogType.Create ? onCreateGroup() : onEditGroupName());
            onClose();
        } catch (error) {
        } finally {
            setBusy(false);
        }
    };
    const onClose = () => {
        onFinished();
    };

    // 新建分组
    const onCreateGroup = async () => {
        const tagId = `${new Date().getTime()}/${cli.getUserId()}/${cli.getDeviceId()}`;

        // 添加前做去重处理
        const tags = [...SpaceStore.instance.spaceTags];
        const newTag = {
            tagId,
            tagName: name.trim(),
        };
        const index = tags.findIndex((item) => item.tagId === tagId);
        if (index !== -1) {
            tags.splice(index, 1, newTag);
        } else {
            tags.push(newTag);
        }

        await SpaceStore.instance.sendSpaceTags(tags);
    };

    // 编辑分组名称
    const onEditGroupName = async () => {
        const tags = [...SpaceStore.instance.spaceTags];
        const index = tags.findIndex((item) => item.tagId === tagId);
        if (index !== -1) {
            tags.splice(index, 1, {
                ...tags[index],
                tagName: name.trim(),
            });

            await SpaceStore.instance.sendSpaceTags(tags);
        }
    };

    const onChange = (ev: ChangeEvent<HTMLInputElement>) => {
        setName(ev.target.value);
    };

    const onGroupNameValidate = async (fieldState: IFieldState): Promise<IValidationResult> => {
        const result = await validateGroupRoomName({
            ...fieldState,
            allowEmpty: false,
        });
        setGroupNameValidate(result.valid);
        return result;
    };

    const footer = (
        <DialogButtons
            primaryButton={type === DialogType.Create ? _t("Create") : _t("Save")}
            primaryDisabled={!groupNameValidate || busy}
            primaryLoading={busy}
            onPrimaryButtonClick={onOk}
            cancelButton={_t("Cancel")}
            onCancel={onClose}
        />
    );

    return (
        <BaseDialog
            className="mx_GroupNameDialog"
            onFinished={onClose}
            title={type === DialogType.Create ? _t("Create Group") : _t("Edit Group Name")}
            footer={footer}
        >
            <Field
                label={_t("Group Name")}
                placeholder={_t("Please enter a name for the group")}
                usePlaceholderAsHint={true}
                autoFocus={false}
                value={name}
                wordLimit={80}
                onChange={onChange}
                disabled={busy}
                autoComplete="off"
                validateOnFocus={false}
                onValidate={onGroupNameValidate}
            />
        </BaseDialog>
    );
};

export default memo(GroupNameDialog);
