import { Room } from "matrix-js-sdk/src/models/room";
import React, { FC, useCallback, useMemo, useState } from "react";
import { ButtonEvent } from "matrix-react-sdk/src/components/views/elements/AccessibleButton";
import LegacyCallHandler, { LegacyCallHandlerEvent } from "matrix-react-sdk/src/LegacyCallHandler";
import { CallType } from "matrix-js-sdk/src/webrtc/call";
import AccessibleTooltipButton from "matrix-react-sdk/src/components/views/elements/AccessibleTooltipButton";
import { _t } from "matrix-react-sdk/src/languageHandler";
import { Alignment } from "matrix-react-sdk/src/components/views/elements/Tooltip";
import { aboveLeftOf, useContextMenu } from "matrix-react-sdk/src/components/structures/ContextMenu";
import defaultDispatcher from "matrix-react-sdk/src/dispatcher/dispatcher";
import { ViewRoomPayload } from "matrix-react-sdk/src/dispatcher/payloads/ViewRoomPayload";
import { Action } from "matrix-react-sdk/src/dispatcher/actions";
import SdkConfig, { DEFAULTS } from "matrix-react-sdk/src/SdkConfig";
import IconizedContextMenu, {
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
} from "matrix-react-sdk/src/components/views/context_menus/IconizedContextMenu";
import { useFeatureEnabled, useSettingValue } from "matrix-react-sdk/src/hooks/useSettings";
import { isVideoRoom as calcIsVideoRoom } from "matrix-react-sdk/src/utils/video-rooms";
import { useEventEmitterState, useTypedEventEmitterState } from "matrix-react-sdk/src/hooks/useEventEmitter";
import { useWidgets } from "matrix-react-sdk/src/components/views/right_panel/RoomSummaryCard";
import { WidgetType } from "matrix-react-sdk/src/widgets/WidgetType";
import { useCall } from "matrix-react-sdk/src/hooks/useCall";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { getJoinedNonFunctionalMembers } from "matrix-react-sdk/src/utils/room/getJoinedNonFunctionalMembers";
import { ElementCall } from "matrix-react-sdk/src/models/Call";

class DisabledWithReason {
    public constructor(public readonly reason: string) {}
}

interface VoiceCallButtonProps {
    className?: string;
    room: Room;
    busy: boolean;
    setBusy: (value: boolean) => void;
    behavior: DisabledWithReason | "legacy_or_jitsi";
}

/**
 * Button for starting voice calls, supporting only legacy 1:1 calls and Jitsi
 * widgets.
 */
const VoiceCallButton: FC<VoiceCallButtonProps> = ({ room, busy, setBusy, behavior, className }) => {
    const { onClick, tooltip, disabled } = useMemo(() => {
        if (behavior instanceof DisabledWithReason) {
            return {
                onClick: () => {},
                tooltip: behavior.reason,
                disabled: true,
            };
        } else {
            // behavior === "legacy_or_jitsi"
            return {
                onClick: async (ev: ButtonEvent): Promise<void> => {
                    ev.preventDefault();
                    setBusy(true);
                    await LegacyCallHandler.instance.placeCall(room.roomId, CallType.Voice);
                    setBusy(false);
                },
                disabled: false,
            };
        }
    }, [behavior, room, setBusy]);

    return (
        <AccessibleTooltipButton
            className={`mx_CallButton mx_CallButton_voiceCall ${className}`}
            onClick={onClick}
            title={_t("Voice call")}
            tooltip={tooltip ?? _t("Voice call")}
            alignment={Alignment.Top}
            disabled={disabled || busy}
        />
    );
};

interface VideoCallButtonProps {
    className?: string;
    room: Room;
    busy: boolean;
    setBusy: (value: boolean) => void;
    behavior: DisabledWithReason | "legacy_or_jitsi" | "element" | "jitsi_or_element";
}

/**
 * Button for starting video calls, supporting both legacy 1:1 calls, Jitsi
 * widgets, and native group calls. If multiple calling options are available,
 * this shows a menu to pick between them.
 */
const VideoCallButton: FC<VideoCallButtonProps> = ({ room, busy, setBusy, behavior, className }) => {
    const [menuOpen, buttonRef, openMenu, closeMenu] = useContextMenu();

    const startLegacyCall = useCallback(async (): Promise<void> => {
        setBusy(true);
        await LegacyCallHandler.instance.placeCall(room.roomId, CallType.Video);
        setBusy(false);
    }, [setBusy, room]);

    const startElementCall = useCallback(() => {
        setBusy(true);
        defaultDispatcher.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: room.roomId,
            view_call: true,
            metricsTrigger: undefined,
        });
        setBusy(false);
    }, [setBusy, room]);

    const { onClick, tooltip, disabled } = useMemo(() => {
        if (behavior instanceof DisabledWithReason) {
            return {
                onClick: () => {},
                tooltip: behavior.reason,
                disabled: true,
            };
        } else if (behavior === "legacy_or_jitsi") {
            return {
                onClick: async (ev: ButtonEvent): Promise<void> => {
                    ev.preventDefault();
                    await startLegacyCall();
                },
                disabled: false,
            };
        } else if (behavior === "element") {
            return {
                onClick: async (ev: ButtonEvent): Promise<void> => {
                    ev.preventDefault();
                    startElementCall();
                },
                disabled: false,
            };
        } else {
            // behavior === "jitsi_or_element"
            return {
                onClick: async (ev: ButtonEvent): Promise<void> => {
                    ev.preventDefault();
                    openMenu();
                },
                disabled: false,
            };
        }
    }, [behavior, startLegacyCall, startElementCall, openMenu]);

    const onJitsiClick = useCallback(
        async (ev: ButtonEvent): Promise<void> => {
            ev.preventDefault();
            closeMenu();
            await startLegacyCall();
        },
        [closeMenu, startLegacyCall],
    );

    const onElementClick = useCallback(
        (ev: ButtonEvent) => {
            ev.preventDefault();
            closeMenu();
            startElementCall();
        },
        [closeMenu, startElementCall],
    );

    let menu: JSX.Element | null = null;
    if (menuOpen) {
        const buttonRect = buttonRef.current!.getBoundingClientRect();
        const brand = SdkConfig.get("element_call").brand ?? DEFAULTS.element_call.brand;
        menu = (
            <IconizedContextMenu {...aboveLeftOf(buttonRect)} onFinished={closeMenu}>
                <IconizedContextMenuOptionList>
                    <IconizedContextMenuOption label={_t("Video call (Jitsi)")} onClick={onJitsiClick} />
                    <IconizedContextMenuOption
                        label={_t("Video call (%(brand)s)", { brand })}
                        onClick={onElementClick}
                    />
                </IconizedContextMenuOptionList>
            </IconizedContextMenu>
        );
    }

    return (
        <>
            <AccessibleTooltipButton
                inputRef={buttonRef}
                className={`mx_CallButton mx_CallButton_videoCall ${className}`}
                onClick={onClick}
                title={_t("Video call")}
                tooltip={tooltip ?? _t("Video call")}
                alignment={Alignment.Top}
                disabled={disabled || busy}
            />
            {menu}
        </>
    );
};

interface CallButtonsProps {
    room: Room;
    className?: string;
}

// The header buttons for placing calls have become stupidly complex, so here
// they are as a separate component
const CallButtons: FC<CallButtonsProps> = ({ room, className }) => {
    const [busy, setBusy] = useState(false);
    const showButtons = useSettingValue<boolean>("showCallButtonsInComposer");
    const groupCallsEnabled = useFeatureEnabled("feature_group_calls");
    const videoRoomsEnabled = useFeatureEnabled("feature_video_rooms");
    const isVideoRoom = useMemo(() => videoRoomsEnabled && calcIsVideoRoom(room), [videoRoomsEnabled, room]);
    const useElementCallExclusively = useMemo(() => {
        return SdkConfig.get("element_call").use_exclusively ?? DEFAULTS.element_call.use_exclusively;
    }, []);

    const hasLegacyCall = useEventEmitterState(
        LegacyCallHandler.instance,
        LegacyCallHandlerEvent.CallsChanged,
        useCallback(() => LegacyCallHandler.instance.getCallForRoom(room.roomId) !== null, [room]),
    );

    const widgets = useWidgets(room);
    const hasJitsiWidget = useMemo(() => widgets.some((widget) => WidgetType.JITSI.matches(widget.type)), [widgets]);

    const hasGroupCall = useCall(room.roomId) !== null;

    const [functionalMembers, mayEditWidgets, mayCreateElementCalls] = useTypedEventEmitterState(
        room,
        RoomStateEvent.Update,
        useCallback(
            () => [
                getJoinedNonFunctionalMembers(room),
                room.currentState.mayClientSendStateEvent("im.vector.modular.widgets", room.client),
                room.currentState.mayClientSendStateEvent(ElementCall.CALL_EVENT_TYPE.name, room.client),
            ],
            [room],
        ),
    );

    const makeVoiceCallButton = (behavior: VoiceCallButtonProps["behavior"]): JSX.Element => (
        <VoiceCallButton className={className} room={room} busy={busy} setBusy={setBusy} behavior={behavior} />
    );
    const makeVideoCallButton = (behavior: VideoCallButtonProps["behavior"]): JSX.Element => (
        <VideoCallButton className={className} room={room} busy={busy} setBusy={setBusy} behavior={behavior} />
    );

    if (isVideoRoom || !showButtons) {
        return null;
    } else if (groupCallsEnabled) {
        if (useElementCallExclusively) {
            if (hasGroupCall) {
                return makeVideoCallButton(new DisabledWithReason(_t("Ongoing call")));
            } else if (mayCreateElementCalls) {
                return makeVideoCallButton("element");
            } else {
                return makeVideoCallButton(
                    new DisabledWithReason(_t("You do not have permission to start video calls")),
                );
            }
        } else if (hasLegacyCall || hasJitsiWidget || hasGroupCall) {
            return (
                <>
                    {makeVoiceCallButton(new DisabledWithReason(_t("Ongoing call")))}
                    {makeVideoCallButton(new DisabledWithReason(_t("Ongoing call")))}
                </>
            );
        } else if (functionalMembers.length <= 1) {
            return (
                <>
                    {makeVoiceCallButton(new DisabledWithReason(_t("There's no one here to call")))}
                    {makeVideoCallButton(new DisabledWithReason(_t("There's no one here to call")))}
                </>
            );
        } else if (functionalMembers.length === 2) {
            return (
                <>
                    {makeVoiceCallButton("legacy_or_jitsi")}
                    {makeVideoCallButton("legacy_or_jitsi")}
                </>
            );
        } else if (mayEditWidgets) {
            return (
                <>
                    {makeVoiceCallButton("legacy_or_jitsi")}
                    {makeVideoCallButton(mayCreateElementCalls ? "jitsi_or_element" : "legacy_or_jitsi")}
                </>
            );
        } else {
            const videoCallBehavior = mayCreateElementCalls
                ? "element"
                : new DisabledWithReason(_t("You do not have permission to start video calls"));
            return (
                <>
                    {makeVoiceCallButton(new DisabledWithReason(_t("You do not have permission to start voice calls")))}
                    {makeVideoCallButton(videoCallBehavior)}
                </>
            );
        }
    } else if (hasLegacyCall || hasJitsiWidget) {
        return (
            <>
                {makeVoiceCallButton(new DisabledWithReason(_t("Ongoing call")))}
                {makeVideoCallButton(new DisabledWithReason(_t("Ongoing call")))}
            </>
        );
    } else if (functionalMembers.length <= 1) {
        return (
            <>
                {makeVoiceCallButton(new DisabledWithReason(_t("There's no one here to call")))}
                {makeVideoCallButton(new DisabledWithReason(_t("There's no one here to call")))}
            </>
        );
    } else if (functionalMembers.length === 2 || mayEditWidgets) {
        return (
            <>
                {makeVoiceCallButton("legacy_or_jitsi")}
                {makeVideoCallButton("legacy_or_jitsi")}
            </>
        );
    } else {
        return (
            <>
                {makeVoiceCallButton(new DisabledWithReason(_t("You do not have permission to start voice calls")))}
                {makeVideoCallButton(new DisabledWithReason(_t("You do not have permission to start video calls")))}
            </>
        );
    }
};

export default CallButtons;
