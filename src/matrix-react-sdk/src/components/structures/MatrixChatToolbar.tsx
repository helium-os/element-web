import React, { memo } from "react";
import MessageSearch from "matrix-react-sdk/src/components/views/toolbar/MessageSearch";

interface IProps {}
const MatrixChatToolbar: React.FC<IProps> = () => {
    return (
        <>
            <MessageSearch />
        </>
    );
};

export default memo(MatrixChatToolbar);
