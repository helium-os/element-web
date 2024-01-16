import React, { useEffect, useRef } from "react";
export default function useFnRef<Fn>(fn: Fn): React.MutableRefObject<Fn> {
    const fnRef = useRef<Fn>();

    useEffect(() => {
        fnRef.current = fn;
    }, [fn]);

    return fnRef;
}
