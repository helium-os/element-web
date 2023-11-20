import React, { memo, useState } from "react";
import BaseDialog from "../BaseDialog";
import StepTips from "./StepTips";
import { _t } from "matrix-react-sdk/src/languageHandler";
import DialogButtons from "matrix-react-sdk/src/components/views/elements/DialogButtons";
import Field from "matrix-react-sdk/src/components/views/elements/Field";
import { JoinRule, Preset } from "matrix-js-sdk/src/@types/partials";
import createRoom from "matrix-react-sdk/src/createRoom";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";

interface IProps {
    totalStep: number;
    stepIndex: number;
    onStepChange: (step: number) => void;
    spaceId: string;
    onFinished: () => void;
}

interface ChannelItem {
    name: string;
    id: number;
}
const AddChannelDialog: React.FC<IProps> = ({ totalStep, stepIndex, onStepChange, spaceId, onFinished }) => {
    const [channelList, setChannelList] = useState<ChannelItem[]>([
        {
            id: new Date().getTime(),
            name: "",
        },
    ]);

    const [busy, setBusy] = useState(false);

    const onOk = async () => {
        if (busy) return;

        setBusy(true);
        try {
            await onCreateChannels();
        } catch (error) {
            console.error(error);
        } finally {
            setBusy(false);
            onNext();
        }
    };

    const onClose = () => {
        onFinished?.();
    };

    const onNext = () => {
        onStepChange(stepIndex + 1);
    };

    const onBack = () => {
        onStepChange(stepIndex - 1);
    };

    const onRoomNameChange = (id, value) => {
        const newChannelList = [...channelList];
        const index = newChannelList.findIndex((item) => item.id === id);
        if (index === -1) return;

        newChannelList.splice(index, 1, {
            ...newChannelList[index],
            name: value,
        });
        setChannelList(newChannelList);
    };

    // 点击添加频道
    const onAddChannel = () => {
        setChannelList([
            ...channelList,
            {
                id: new Date().getTime(),
                name: "",
            },
        ]);
    };

    // 点击删除频道
    const onDeleteChannel = (id) => {
        const newChannelList = [...channelList];
        const index = newChannelList.findIndex((item) => item.id === id);
        if (index === -1) return;

        newChannelList.splice(index, 1);
        setChannelList(newChannelList);
    };

    // 创建频道
    const onCreateChannels = async (): Promise<string[] | void> => {
        if (!spaceId) return;

        const filteredRoomNames = channelList.map((item) => item.name.trim()).filter(Boolean);
        if (!filteredRoomNames.length) return;

        const spaceRoom = MatrixClientPeg.get().getRoom(spaceId);

        return Promise.all(
            filteredRoomNames.map((name) => {
                return createRoom({
                    createOpts: {
                        preset: Preset.PrivateChat,
                        name,
                    },
                    spinner: false,
                    encryption: false,
                    andView: false,
                    inlineErrors: true,
                    parentSpace: spaceRoom,
                    joinRule: JoinRule.Restricted, // 创建对社区内可见频道
                    suggested: true,
                });
            }),
        );
    };

    const footerAdditive = <StepTips total={totalStep} step={stepIndex} canSkip={true} onSkip={onNext} />;

    const footer = (
        <DialogButtons
            additive={footerAdditive}
            primaryButton={_t("Add")}
            onPrimaryButtonClick={onOk}
            cancelButton={_t("Back")}
            onCancel={onBack}
        />
    );

    return (
        <BaseDialog
            className="mx_AddChannelDialog"
            onFinished={onClose}
            title={_t("Add room")}
            description={"让我们为每一个主题创建一个频道吧。稍后你可以添加更多频道，包括现有的。"}
            footer={footer}
        >
            <form>
                {channelList.map((item, index) => (
                    <div key={index} className="mx_AddChannel_content mx_AddChannelItem">
                        <div className="mx_AddChannel_actionBar">
                            <div className="shortLine" />
                            <div
                                className="mx_ChannelAction_icon mx_IconDelete"
                                onClick={() => onDeleteChannel(item.id)}
                            />
                            <div className="longLine" />
                        </div>
                        <div className="mx_AddChannel_right mx_AddChannelItem_name">
                            <Field
                                type="text"
                                value={item.name}
                                label={_t("Room name")}
                                placeholder={"请为你的频道想一个名字"}
                                usePlaceholderAsHint={true}
                                autoFocus={false}
                                onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                                    onRoomNameChange(item.id, ev.target.value)
                                }
                                disabled={busy}
                                autoComplete="off"
                            />
                        </div>
                    </div>
                ))}
                <div className="mx_AddChannel_content  mx_AddChannel_addBox" onClick={onAddChannel}>
                    <div className="mx_AddChannel_actionBar">
                        <div className="mx_ChannelAction_icon mx_IconAdd" />
                    </div>
                    <p className="mx_AddChannel_right mx_AddChannel_addText">添加</p>
                </div>
            </form>
        </BaseDialog>
    );
};

export default memo(AddChannelDialog);
