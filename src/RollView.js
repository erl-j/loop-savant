import React from "react";
import SelectionArea, { SelectionEvent } from "@viselect/react";
import { useState } from "react";
import "./index.css";
import * as _ from "lodash";
import { Tooltip } from "react-tooltip";

const RollView = ({ nPitches, nTimeSteps, roll, setRoll, timeStep, mask, setMask, editMode, setTimeStep }) => {

    const pitchRange = Array.from(Array(nPitches).keys());
    const timeRange = Array.from(Array(nTimeSteps).keys());

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

    function mutableRotateRight(arr, n = 1) {
        for (let i = 0; i < n; i++) {
            arr.unshift(arr.pop())
        }
        return arr;
    }

    function mutableRotateLeft(arr, n = 1) {
        for (let i = 0; i < n; i++) {
            arr.unshift(arr.pop())
        }
        return arr;
    }

    const children = <div style={{ display: "flex", flexDirection: "column" }} >
        {[...pitchRange.reverse(), "set_start"].map((pitch) =>
            <div key={pitch} style={{ display: "flex", flexDirection: "row" }} >
                {timeRange.map((time) => {
                    return (pitch !== "set_start" ?
                        <div key={pitch * nTimeSteps + time}
                            onMouseDown={() => {
                                if (editMode == "draw" || editMode == "erase") {
                                    const newRoll = [...roll];
                                    newRoll[pitch * nTimeSteps + time] = editMode == "draw" ? 1 : 0;
                                    setRoll(newRoll);
                                }
                            }
                            }
                            onMouseEnter={(e) => {
                                if (editMode == "draw" || editMode == "erase") {
                                    // if pressed, toggle
                                    if (e.buttons == 1) {
                                        const newRoll = [...roll];
                                        newRoll[pitch * nTimeSteps + time] = editMode == "draw" ? 1 : 0;
                                        setRoll(newRoll);
                                    }
                                }
                            }}
                            className="selectable"
                            data-key={pitch * nTimeSteps + time}
                            style={{
                                width: 32,
                                height: 18,
                                margin: 0,
                                opacity: mask[pitch * nTimeSteps + time] == 0 ? 1 : 0.1,
                                backgroundColor: roll[pitch * nTimeSteps + time] == 0 ?
                                    (time % 4 == 0 ? "lightgray" : "white") : "black",
                                border: time == timeStep ? "1px solid red" : "1px solid darkgray"
                            }}
                        ></div>
                        :
                        <React.Fragment key={time}>
                            <div key={time} id={`set-start-${time}`}
                                style={{
                                    width: 32,
                                    height: 18,
                                    margin: 0,
                                    border: "1px solid darkgray",
                                    backgroundColor: "green",
                                }}
                                onClick={() => {
                                    const newRoll = _.chunk(roll, nTimeSteps).map(x => mutableRotateRight(x, nTimeSteps - time)).flat();
                                    setRoll(newRoll);
                                    const newMask = _.chunk(mask, nTimeSteps).map(x => mutableRotateRight(x, nTimeSteps - time)).flat();
                                    setMask(newMask);
                                    setTimeStep(step => (step + nTimeSteps - time) % nTimeSteps);
                                }
                                }

                            >

                            </div>
                            <Tooltip anchorId={`set-start-${time}`} place="bottom" type="dark" effect="solid" content={`set start at ${time}`}></Tooltip>
                        </React.Fragment >
                    )
                })}
            </div>
        )
        }
    </div >

    // div has keyboard events for mask mode
    return (
        <div>
            {
                editMode == "select" ? <SelectionArea
                    className="container"
                    onStart={onStart}
                    onMove={onMove}
                    selectables=".selectable"
                >
                    {children}
                </SelectionArea> : <div>{children}</div>
            }
        </div >)
}

export default RollView;