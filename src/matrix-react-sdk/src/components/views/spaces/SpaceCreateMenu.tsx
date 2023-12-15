/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, {
    ComponentProps,
    RefObject,
    SyntheticEvent,
    KeyboardEvent,
    useContext,
    useRef,
    useState,
    ChangeEvent,
    ReactNode,
} from "react";
import classNames from "classnames";
import { RoomType } from "matrix-js-sdk/src/@types/event";
import { ICreateRoomOpts } from "matrix-js-sdk/src/@types/requests";
import { HistoryVisibility, Preset, Visibility } from "matrix-js-sdk/src/@types/partials";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../../languageHandler";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import ContextMenu, { ChevronFace } from "../../structures/ContextMenu";
import createRoom, { IOpts as ICreateOpts } from "../../../createRoom";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import SpaceBasicSettings from "./SpaceBasicSettings";
import AccessibleButton, { ButtonEvent } from "../elements/AccessibleButton";
import Field from "../elements/Field";
import withValidation, { IFieldState, IValidationResult } from "../elements/Validation";
import RoomAliasField from "../elements/RoomAliasField";
import Modal from "../../../Modal";
import GenericFeatureFeedbackDialog from "../dialogs/GenericFeatureFeedbackDialog";
import SettingsStore from "../../../settings/SettingsStore";
import { getKeyBindingsManager } from "../../../KeyBindingsManager";
import { KeyBindingAction } from "../../../accessibility/KeyboardShortcuts";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { shouldShowFeedback } from "../../../utils/Feedback";
import AvatarSetting from "matrix-react-sdk/src/components/views/settings/AvatarSetting";

export const createSpace = async (
    name: string,
    isPublic: boolean,
    alias?: string,
    topic?: string,
    avatar?: string | File,
    createOpts: Partial<ICreateRoomOpts> = {},
    otherOpts: Partial<Omit<ICreateOpts, "createOpts">> = {},
): Promise<string | null> => {
    return createRoom({
        createOpts: {
            name,
            preset: isPublic ? Preset.PublicChat : Preset.PrivateChat,
            visibility:
                isPublic && (await MatrixClientPeg.get().doesServerSupportUnstableFeature("org.matrix.msc3827.stable"))
                    ? Visibility.Public
                    : Visibility.Private,
            power_level_content_override: {
                // Only allow Admins to write to the timeline to prevent hidden sync spam
                events_default: 100,
                invite: isPublic ? 0 : 50,
            },
            room_alias_name: isPublic && alias ? alias.substring(1, alias.indexOf(":")) : undefined,
            topic,
            ...createOpts,
        },
        avatar,
        roomType: RoomType.Space,
        historyVisibility: HistoryVisibility.WorldReadable,
        // historyVisibility: isPublic ? HistoryVisibility.WorldReadable : HistoryVisibility.Invited,
        spinner: false,
        encryption: false,
        andView: true,
        inlineErrors: true,
        ...otherOpts,
    });
};

export const SpaceCreateMenuType: React.FC<{
    title: string;
    description: string;
    className: string;
    onClick(): void;
}> = ({ title, description, className, onClick }) => {
    return (
        <AccessibleButton className={classNames("mx_SpaceTypeItem", className)} onClick={onClick}>
            <div className="mx_SpaceTypeItem_wrap">
                <span className="mx_SpaceTypeItem_icon" />
                <div className="mx_SpaceTypeItem_introduce">
                    <p className="mx_SpaceTypeItem_title">{title}</p>
                    <span className="mx_SpaceTypeItem_description">{description}</span>
                </div>
            </div>
        </AccessibleButton>
    );
};

export const spaceNameValidator = withValidation({
    rules: [
        {
            key: "required",
            test: async ({ value }) => !!value,
            invalid: () =>
                _t("Please enter a name for the room", {
                    roomType: _t("space"),
                }),
        },
    ],
});

const nameToLocalpart = (name: string): string => {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9_-]+/gi, "");
};

// XXX: Temporary for the Spaces release only
export const SpaceFeedbackPrompt: React.FC<{
    onClick?(): void;
}> = ({ onClick }) => {
    if (!shouldShowFeedback()) return null;

    return (
        <div className="mx_SpaceFeedbackPrompt">
            <span className="mx_SpaceFeedbackPrompt_text">{_t("Spaces are a new feature.")}</span>
            <AccessibleButton
                kind="link_inline"
                onClick={() => {
                    if (onClick) onClick();
                    Modal.createDialog(GenericFeatureFeedbackDialog, {
                        title: _t("Spaces feedback"),
                        subheading: _t(
                            "Thank you for trying Spaces. " + "Your feedback will help inform the next versions.",
                        ),
                        rageshakeLabel: "spaces-feedback",
                        rageshakeData: Object.fromEntries(
                            ["Spaces.allRoomsInHome", "Spaces.enabledMetaSpaces"].map((k) => [
                                k,
                                SettingsStore.getValue(k),
                            ]),
                        ),
                    });
                }}
            >
                {_t("Give feedback.")}
            </AccessibleButton>
        </div>
    );
};

type BProps = Omit<ComponentProps<typeof SpaceBasicSettings>, "nameDisabled" | "topicDisabled" | "avatarDisabled">;
interface ISpaceCreateFormProps extends BProps {
    busy?: boolean;
    nameFieldRef: RefObject<Field>;
    onNameValidate?: (input: IFieldState) => Promise<IValidationResult>;
    showAliasField?: boolean;
    aliasFieldRef?: RefObject<RoomAliasField>;
    alias?: string;
    setAlias?(alias: string): void;
    showTopicField?: boolean;
    children?: ReactNode;
    onSubmit?(e: SyntheticEvent): void;
}

export const SpaceCreateForm: React.FC<ISpaceCreateFormProps> = ({
    busy = false,
    onSubmit,
    avatarUrl,
    setAvatar,
    name,
    nameFieldRef,
    setName,
    onNameValidate,
    alias,
    aliasFieldRef,
    setAlias,
    showAliasField,
    showTopicField = false,
    topic,
    setTopic,
    children,
}) => {
    const cli = useContext(MatrixClientContext);
    const domain = cli.getDomain() ?? undefined;

    const onKeyDown = (ev: KeyboardEvent): void => {
        const action = getKeyBindingsManager().getAccessibilityAction(ev);
        switch (action) {
            case KeyBindingAction.Enter:
                onSubmit?.(ev);
                break;
        }
    };

    return (
        <form className="mx_SpaceBasicSettings" onSubmit={onSubmit}>
            <AvatarSetting avatarUrl={avatarUrl} setAvatar={setAvatar} avatarDisabled={busy} />

            <Field
                name="spaceName"
                label={_t("Space Name")}
                placeholder={_t("Please enter a name for the room", {
                    roomType: _t("space"),
                })}
                usePlaceholderAsHint={true}
                autoFocus={false}
                wordLimit={80}
                value={name}
                onChange={(ev: ChangeEvent<HTMLInputElement>) => {
                    const newName = ev.target.value;
                    if (showAliasField && (!alias || alias === `#${nameToLocalpart(name)}:${domain}`)) {
                        setAlias(`#${nameToLocalpart(newName)}:${domain}`);
                        aliasFieldRef.current?.validate({ allowEmpty: true });
                    }
                    setName(newName);
                }}
                onKeyDown={onKeyDown}
                ref={nameFieldRef}
                disabled={busy}
                autoComplete="off"
                validateOnFocus={false}
                onValidate={onNameValidate}
            />

            {showAliasField ? (
                <RoomAliasField
                    ref={aliasFieldRef}
                    onChange={setAlias}
                    domain={domain}
                    value={alias}
                    placeholder={name ? nameToLocalpart(name) : _t("e.g. my-space")}
                    label={_t("Address")}
                    disabled={busy}
                    onKeyDown={onKeyDown}
                />
            ) : null}

            {showTopicField && (
                <Field
                    name="spaceTopic"
                    element="textarea"
                    label={_t("Description")}
                    value={topic ?? ""}
                    onChange={(ev) => setTopic(ev.target.value)}
                    rows={3}
                    disabled={busy}
                />
            )}

            {children}
        </form>
    );
};

const SpaceCreateMenu: React.FC<{
    onFinished(): void;
}> = ({ onFinished }) => {
    const [visibility, setVisibility] = useState<Visibility | null>(null);
    const [busy, setBusy] = useState<boolean>(false);

    const [name, setName] = useState("");
    const spaceNameField = useRef<Field>();
    const [alias, setAlias] = useState("");
    const spaceAliasField = useRef<RoomAliasField>();
    const [avatar, setAvatar] = useState<File | undefined>(undefined);
    const [topic, setTopic] = useState<string>("");

    const onSpaceCreateClick = async (e: ButtonEvent): Promise<void> => {
        e.preventDefault();
        if (busy) return;

        setBusy(true);
        // require & validate the space name field
        if (spaceNameField.current && !(await spaceNameField.current.validate({ allowEmpty: false }))) {
            spaceNameField.current.focus();
            spaceNameField.current.validate({ allowEmpty: false, focused: true });
            setBusy(false);
            return;
        }

        if (
            spaceAliasField.current &&
            visibility === Visibility.Public &&
            !(await spaceAliasField.current.validate({ allowEmpty: false }))
        ) {
            spaceAliasField.current.focus();
            spaceAliasField.current.validate({ allowEmpty: false, focused: true });
            setBusy(false);
            return;
        }

        try {
            await createSpace(name, visibility === Visibility.Public, alias, topic, avatar);

            onFinished();
        } catch (e) {
            logger.error(e);
        }
    };

    let body;
    if (visibility === null) {
        body = (
            <React.Fragment>
                <h2>{_t("Create a space")}</h2>
                <p>
                    {_t(
                        "Spaces are a new way to group rooms and people. What kind of Space do you want to create? " +
                            "You can change this later.",
                    )}
                </p>

                <SpaceCreateMenuType
                    title={_t("Public")}
                    description={_t("Open space for anyone, best for communities")}
                    className="mx_SpaceTypeItem_public"
                    onClick={() => setVisibility(Visibility.Public)}
                />
                <SpaceCreateMenuType
                    title={_t("Private")}
                    description={_t("Invite only, best for yourself or teams")}
                    className="mx_SpaceTypeItem_private"
                    onClick={() => setVisibility(Visibility.Private)}
                />

                <p>{_t("To join a space you'll need an invite.")}</p>

                <SpaceFeedbackPrompt onClick={onFinished} />
            </React.Fragment>
        );
    } else {
        body = (
            <React.Fragment>
                <AccessibleTooltipButton
                    className="mx_SpaceCreateMenu_back"
                    onClick={() => setVisibility(null)}
                    title={_t("Go back")}
                />

                <h2>{visibility === Visibility.Public ? _t("Your public space") : _t("Your private space")}</h2>
                <p>
                    {_t("Add some details to help people recognise it.")} {_t("You can change these anytime.")}
                </p>

                <SpaceCreateForm
                    busy={busy}
                    setAvatar={setAvatar}
                    name={name}
                    nameFieldRef={spaceNameField}
                    setName={setName}
                    showAliasField={visibility === Visibility.Public}
                    aliasFieldRef={spaceAliasField}
                    alias={alias}
                    setAlias={setAlias}
                    showTopicField={false}
                    topic={topic}
                    setTopic={setTopic}
                    onSubmit={onSpaceCreateClick}
                />

                <AccessibleButton kind="primary" onClick={onSpaceCreateClick} disabled={busy}>
                    {busy ? _t("Creating…") : _t("Create")}
                </AccessibleButton>
            </React.Fragment>
        );
    }

    return (
        <ContextMenu
            left={72}
            top={62}
            chevronOffset={0}
            chevronFace={ChevronFace.None}
            onFinished={onFinished}
            wrapperClassName="mx_SpaceCreateMenu_wrapper"
            managed={false}
            focusLock={true}
        >
            {body}
        </ContextMenu>
    );
};

export default SpaceCreateMenu;
