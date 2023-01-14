import React from "react";
import { N_PITCHES, N_TIMESTEPS } from "./constants";
import SelectionArea, { SelectionEvent } from "@viselect/react";
import { useState } from "react";
import "./index.css";

const pitchRange = Array.from(Array(N_PITCHES).keys());
const timeRange = Array.from(Array(N_TIMESTEPS).keys());

const RollView = ({ roll, setRoll, timeStep, mask, setMask }) => {

    const [isMaskMode, setIsMaskMode] = useState(false);

    const [selected, setSelected] = useState(() => new Set())

    React.useEffect(() => {
        const newMask = new Array(mask.length).fill(0);
        selected.forEach((id) => {
            newMask[id] = 1;
        });
        setMask(newMask);
    }, [selected])

    const extractIds = (els) =>
        els.map((v) => v.getAttribute("data-key"))
            .filter(Boolean)
            .map(Number);

    const onStart = ({ event, selection }) => {
        if (!event?.ctrlKey && !event?.metaKey) {
            // if (!event?.ctrlKey && !event?.metaKey) {
            selection.clearSelection();
            setSelected(() => new Set());
        }
    };
    const onMove = ({
        store: {
            changed: { added, removed }
        }
    }) => {
        setSelected((prev) => {
            const next = new Set(prev);
            extractIds(added).forEach((id) => next.add(id));
            extractIds(removed).forEach((id) => next.delete(id));
            return next;
        });
    }

    const children = <div style={{ display: "flex", flexDirection: "column" }} >
        {pitchRange.map((pitch) =>
            <div key={pitch} style={{ display: "flex", flexDirection: "row" }} >
                {timeRange.map((time) => {
                    return (
                        <div key={time}
                            onClick={() => {
                                const newRoll = [...roll];
                                newRoll[pitch * N_TIMESTEPS + time] = 1 - newRoll[pitch * N_TIMESTEPS + time];
                                setRoll(newRoll);
                            }}
                            onMouseEnter={(e) => {
                                // if pressed, toggle
                                if (e.buttons == 1) {
                                    const newRoll = [...roll];
                                    newRoll[pitch * N_TIMESTEPS + time] = 1 - newRoll[pitch * N_TIMESTEPS + time];
                                    setRoll(newRoll);
                                }
                            }}
                            className="selectable"
                            data-key={pitch * N_TIMESTEPS + time}
                            style={{
                                width: 16,
                                height: 6,
                                margin: 1,
                                opacity: mask[pitch * N_TIMESTEPS + time] == 0 ? 0.5 : 1,
                                backgroundColor: roll[pitch * N_TIMESTEPS + time] == 0 ?
                                    (time % 4 == 0 ? "darkgray" : "gray") : "black",
                                border: time == timeStep ? "4px solid red" : "4px solid black"
                            }}
                        ></div>
                    )
                }
                )}
            </div>
        )}
    </div>

    return (
        <div>
            <button onClick={() => setIsMaskMode((prev) => !prev)} />
            {isMaskMode ? <SelectionArea
                className="container"
                onStart={onStart}
                onMove={onMove}
                selectables=".selectable"
            >
                {children}
            </SelectionArea> : <div>{children}</div>}

        </div>)
}

export default RollView;