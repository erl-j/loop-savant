import React from "react";
import SelectionArea, { SelectionEvent } from "@viselect/react";
import { useState } from "react";
import "./index.css";
import * as _ from "lodash";
import { Tooltip } from "react-tooltip";
import "./index.css";

const RollView = ({ nPitches, nTimeSteps, roll, setRoll, timeStep, mask, setMask, editMode, setTimeStep, modelIsBusy }) => {

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

    const onPressTile = (pitch, time) => {
        if (editMode == "draw" || editMode == "erase") {
            const newRoll = [...roll];
            newRoll[pitch * nTimeSteps + time] = editMode == "draw" ? 1 : 0;
            setRoll(newRoll);
        }
    }

    let tileWidth = 32;
    let tileHeight = 18;

    const renderTile = (pitch, time) => {

        let isSelected = mask[pitch * nTimeSteps + time] == 1;
        let isOn = roll[pitch * nTimeSteps + time] == 1;
        let isAccent = time % 4 == 0;
        let isBeingPlayed = time == timeStep;



        return (<div key={pitch * nTimeSteps + time}
            data-key={pitch * nTimeSteps + time}
            className="selectable"
            onMouseDown={() => {
                onPressTile(pitch, time);
            }
            }
            onMouseEnter={(e) => {
                // if pressed, toggle
                if (e.buttons == 1) {
                    onPressTile(pitch, time);
                }

            }}

            style={{
                width: tileWidth,
                height: tileHeight,
                margin: 0,
                opacity: !isOn ?
                    (isAccent ? 0.1 : 0.05) : 1.0,
                backgroundColor: isSelected ? "teal" : "black",
                border: isBeingPlayed ? "1px solid gray" : "1px solid darkgray",
                transition: "transform 0.3s ease-out",
                transform: (isBeingPlayed & isOn) ? "scale(1.1, 1.4)" : "scale(1.0, 1.0)",
                animation: (isSelected && modelIsBusy) ? `pulse-animation ${0.5 + Math.random() * 3}s infinite alternate` : "none"
            }
            }
        ></div >)
    }

    const children = <div style={{ display: "flex", flexDirection: "column" }} >
        {[...pitchRange.reverse(), "set_start"].map((pitch) =>
            <div key={pitch} style={{ display: "flex", flexDirection: "row" }} >
                {timeRange.map((time) => {
                    return (pitch !== "set_start" ?
                        renderTile(pitch, time)
                        // <Tile dataKey={pitch * nTimeSteps + time} key={pitch * nTimeSteps + time} isOn={roll[pitch * nTimeSteps + time] == 1} isSelected={mask[pitch * nTimeSteps + time] == 1} isAccent={time % 4 == 0} isBeingPlayed={time == timeStep} onPressTile={() => onPressTile(pitch, time)} />
                        // <div key={pitch * nTimeSteps + time}
                        //     data-key={pitch * nTimeSteps + time}
                        //     className="selectable"
                        //     onMouseDown={() => {
                        //         onPressTile(pitch, time);
                        //     }
                        //     }
                        //     onMouseEnter={(e) => {
                        //         // if pressed, toggle
                        //         if (e.buttons == 1) {
                        //             onPressTile(pitch, time);
                        //         }

                        //     }}

                        //     style={{
                        //         width: 32,
                        //         height: 18,
                        //         margin: 0,
                        //         opacity: mask[pitch * nTimeSteps + time] == 0 ? 1 : 0.1,
                        //         backgroundColor: roll[pitch * nTimeSteps + time] == 0 ?
                        //             (time % 4 == 0 ? "lightgray" : "white") : "black",
                        //         border: time == timeStep ? "1px solid red" : "1px solid darkgray"
                        //     }}
                        // ></div>
                        :
                        <React.Fragment key={time}>
                            <div key={time} id={`set-start-${time}`}
                                style={{
                                    width: tileWidth,
                                    height: tileHeight * 2,
                                    margin: 0,
                                    border: "1px solid white",
                                    // backgroundColor: "green",


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
                                <div style={{
                                    backgroundColor: "black",
                                    width: tileHeight * 0.2,
                                    height: tileHeight * 0.2,
                                    margin: "auto",
                                    borderRadius: "100%",
                                }}></div>
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