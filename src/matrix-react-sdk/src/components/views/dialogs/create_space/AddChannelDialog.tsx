import React, { memo, useState, useEffect } from "react";
import BaseDialog from "../BaseDialog";
import { _t } from "matrix-react-sdk/src/languageHandler";
import DialogButtons from "matrix-react-sdk/src/components/views/elements/DialogButtons";
import Field from "matrix-react-sdk/src/components/views/elements/Field";
import { JoinRule, Preset } from "matrix-js-sdk/src/@types/partials";
import createRoom from "matrix-react-sdk/src/createRoom";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import RoomListActions from "matrix-react-sdk/src/actions/RoomListActions";

interface IProps {
    stepIndex: number;
    onStepChange: (step: number) => void;
    spaceId: string;
    onFinished: () => void;
    [key: string]: any;
}

interface ChannelItem {
    name: string;
    id: number;
}

const addLimitCount = 3;
const AddChannelDialog: React.FC<IProps> = ({ stepIndex, onStepChange, spaceId, onFinished }) => {
    const [channelList, setChannelList] = useState<ChannelItem[]>([
        {
            id: new Date().getTime(),
            name: "",
        },
    ]);

    const [channelCount, setChannelCount] = useState<number>(0);

    const [showAddBtn, setShowAddBtn] = useState<boolean>(true);

    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setChannelCount(channelList.filter((item) => !!item.name).length);
    }, [channelList]);

    useEffect(() => {
        setShowAddBtn(channelCount < addLimitCount);
    }, [channelCount]);

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

        const firstChannelOrder = RoomListActions.generateNewRoomOrderInUntaggedTag();
        return Promise.all(
            filteredRoomNames.map((name, index) => {
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
                    tags: [{ order: +firstChannelOrder + index + "" }],
                });
            }),
        );
    };

    const footer = (
        <DialogButtons
            primaryButton={channelCount > 0 ? _t("Add") : _t("Next")}
            primaryButtonProps={{
                disabled: busy,
                loading: busy,
            }}
            onPrimaryButtonClick={channelCount > 0 ? onOk : onNext}
            cancelButton={_t("Skip")}
            onCancel={onNext}
        />
    );

    return (
        <BaseDialog
            className="mx_AddChannelDialog"
            onFinished={onClose}
            title={_t("Create a room", {
                roomType: _t("channel"),
            })}
            description={`请为社区创建一些频道，或"跳过"稍后再创建`}
            footer={footer}
        >
            <form>
                <div className={!showAddBtn ? "mx_AddChannel_exceedLimit" : ""}>
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
                                    wordLimit={80}
                                    label={_t("Room name", { roomType: _t("Channel") })}
                                    placeholder={_t("Please enter a name for the channel")}
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
                </div>
                {showAddBtn && (
                    <div className="mx_AddChannel_content  mx_AddChannel_addBox" onClick={onAddChannel}>
                        <div className="mx_AddChannel_actionBar">
                            <div className="mx_ChannelAction_icon mx_IconAdd" />
                        </div>
                        <p className="mx_AddChannel_right mx_AddChannel_addText">添加</p>
                    </div>
                )}
            </form>
        </BaseDialog>
    );
};

export default memo(AddChannelDialog);
