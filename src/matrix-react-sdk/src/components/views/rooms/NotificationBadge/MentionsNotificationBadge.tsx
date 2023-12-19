import React from "react";
import { NotificationColor } from "matrix-react-sdk/src/stores/notifications/NotificationColor";
import { NotificationState } from "matrix-react-sdk/src/stores/notifications/NotificationState";

interface IProps {
    notification: NotificationState;
}

const MentionsNotificationBadge: React.FC<IProps> = ({ notification }) => {
    return (
        <>
            {notification.color >= NotificationColor.Red ? (
                <div className="mx_MentionsNotificationBadge">@我</div>
            ) : null}
        </>
    );
};

export default MentionsNotificationBadge;
