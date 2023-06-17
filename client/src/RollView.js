// import React from "react";
// import SelectionArea, { SelectionEvent } from "@viselect/react";
// import { useState } from "react";
// import "./index.css";
// import * as _ from "lodash";
// import { Tooltip } from "react-tooltip";
// import "./index.css";
// import { Scale } from "tone";

// const RollView = ({ nPitches, nTimeSteps, roll, setRoll, timeStep, mask, setMask, editMode, setTimeStep, modelIsBusy, scale }) => {


//     if( mask === undefined) {
//         mask = new Array(nPitches * nTimeSteps).fill(1)
//     }

//     if( setMask === undefined ){
//         setMask = () => {}
//     }

//     if (editMode === undefined) {
//         editMode = "select"
//     }

//     if (modelIsBusy === undefined) {
//         modelIsBusy = false
//     }

//     const pitchRange = Array.from(Array(nPitches).keys());
//     const timeRange = Array.from(Array(nTimeSteps).keys());

//     const [selected, setSelected] = useState(() => new Set())


//     React.useEffect(() => {
//         const newMask = new Array(mask.length).fill(0);
//         selected.forEach((id) => {
//             newMask[id] = 1;
//         });
//         setMask(newMask);
//     }, [selected])

//     const extractIds = (els) =>
//         els.map((v) => v.getAttribute("data-key"))
//             .filter(Boolean)
//             .map(Number);

//     const onStart = ({ event, selection }) => {
//         if (!event?.ctrlKey && !event?.metaKey) {
//             // if (!event?.ctrlKey && !event?.metaKey) {
//             selection.clearSelection();
//             setSelected(() => new Set());
//         }
//     };
//     const onMove = ({
//         store: {
//             changed: { added, removed }
//         }
//     }) => {
//         setSelected((prev) => {
//             const next = new Set(prev);
//             extractIds(added).forEach((id) => next.add(id));
//             extractIds(removed).forEach((id) => next.delete(id));
//             return next;
//         });
//     }

//     function mutableRotateRight(arr, n = 1) {
//         for (let i = 0; i < n; i++) {
//             arr.unshift(arr.pop())
//         }
//         return arr;
//     }

//     function mutableRotateLeft(arr, n = 1) {
//         for (let i = 0; i < n; i++) {
//             arr.unshift(arr.pop())
//         }
//         return arr;
//     }

//     const onPressTile = (pitch, time) => {
//         if (editMode == "draw" || editMode == "erase") {
//             const newRoll = [...roll];
//             newRoll[pitch * nTimeSteps + time] = editMode == "draw" ? 1 : 0;
//             setRoll(newRoll);
//         }
//     }  

//     const renderTile = (pitch, time) => {

//         let isSelected = mask[pitch * nTimeSteps + time] == 1;
//         let isOn = roll[pitch * nTimeSteps + time] == 1;
//         let isAccent = time % 4 == 0;
//         let isBeingPlayed = time == timeStep;
//         let isRoot = pitch % scale.length == 0;

//         return (<div key={pitch * nTimeSteps + time}
//             data-key={pitch * nTimeSteps + time}
//             className="selectable"
//             onMouseDown={() => {
//                 onPressTile(pitch, time);
//             }
//             }
//             onMouseEnter={(e) => {
//                 // if pressed, toggle
//                 if (e.buttons == 1) {
//                     onPressTile(pitch, time);
//                 }

//             }}

//             style={{
//                 boxSizing: "border-box",
//                 width: "100%",
//                 height: "100%",
//                 margin: 0,
//                 opacity: !isOn ?
//                     (isAccent || isRoot ? 0.1 : 0.05) : 1.0,
//                 backgroundColor: isSelected ? "teal" : "black",
//                 border: isBeingPlayed ? "1px solid gray" : "1px solid darkgray",
//                 transition: "transform 0.3s ease-out",
//                 transform: (isBeingPlayed & isOn) ? "scale(1.1, 1.4)" : "scale(1.0, 1.0)",
//                 animation: (isSelected && modelIsBusy) ? `pulse-animation ${0.5 + Math.random() * 3}s infinite alternate` : "none"
//             }
//             }
//         ></div >)
//     }

//     const children = <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%",}}>
//         {[...pitchRange.reverse(), "set_start"].map((pitch) =>
//             <div key={pitch} style={{ display: "flex", flexDirection: "row", width: "100%", height: "100%",}}>
//                 {timeRange.map((time) => {
//                     return (pitch !== "set_start" ?
//                         renderTile(pitch, time)
//                         :
//                         <React.Fragment key={time}>
//                             <div key={time} id={`set-start-${time}`}
//                                 style={{
//                                     boxSizing: "border-box",
//                                     width: "100%",
//                                     height: "100%",
//                                     margin: 0,
//                                     border: "1px solid white",
//                                     backgroundColor: "gray",


//                                 }}
//                                 onClick={() => {
//                                     const newRoll = _.chunk(roll, nTimeSteps).map(x => mutableRotateRight(x, nTimeSteps - time)).flat();
//                                     setRoll(newRoll);
//                                     const newMask = _.chunk(mask, nTimeSteps).map(x => mutableRotateRight(x, nTimeSteps - time)).flat();
//                                     setMask(newMask);
//                                     setTimeStep(step => (step + nTimeSteps - time) % nTimeSteps);
//                                 }
//                                 }

//                             >

//                             </div>
//                             <Tooltip anchorId={`set-start-${time}`} place="bottom" type="dark" effect="solid" content={`set ${time} as start`}></Tooltip>
//                         </React.Fragment >
//                     )
//                 })}
//             </div>
//         )
//         }
//     </div >

//     // div has keyboard events for mask mode
//     return (
//         <div  style={{width:"100%", height:"100%"}}>
//             {
//                 editMode == "select" ? <SelectionArea
//                     className="container"
//                     onStart={onStart}
//                     onMove={onMove}
//                     selectables=".selectable"
//                 >
//                     {children}
//                 </SelectionArea> : <div  style={{width:"100%", height:"100%"}}>{children}</div>
//             }
//         </div >)
// }

// export default RollView;


// gpt-4 optimized 
import React, { useState, useEffect, useCallback, memo } from "react";
import SelectionArea from "@viselect/react";
import { Tooltip } from "react-tooltip";
import { Scale } from "tone";
import "./index.css";

const RollView = memo(({
    nPitches, 
    nTimeSteps, 
    roll, 
    setRoll, 
    timeStep, 
    mask = new Array(nPitches * nTimeSteps).fill(1), 
    setMask = () => {}, 
    editMode = "select", 
    setTimeStep, 
    modelIsBusy = false, 
    scale 
}) => {

    const pitchRange = Array.from({length: nPitches}, (_, i) => i);
    const timeRange = Array.from({length: nTimeSteps}, (_, i) => i);

    const [selected, setSelected] = useState(() => new Set());

    useEffect(() => {
        const newMask = new Array(mask.length).fill(0);
        selected.forEach((id) => {
            newMask[id] = 1;
        });
        setMask(newMask);
    }, [selected]);

    const extractIds = useCallback((els) =>
        els.map((v) => v.getAttribute("data-key"))
            .filter(Boolean)
            .map(Number),
    []);

    const onStart = useCallback(({ event, selection }) => {
        if (!event?.ctrlKey && !event?.metaKey) {
            selection.clearSelection();
            setSelected(() => new Set());
        }
    }, []);

    const onMove = useCallback(({ store: { changed: { added, removed } } }) => {
        setSelected((prev) => {
            const next = new Set(prev);
            extractIds(added).forEach((id) => next.add(id));
            extractIds(removed).forEach((id) => next.delete(id));
            return next;
        });
    }, [extractIds]);

    const rotateArray = useCallback((arr, n = 1) => {
        const newArr = [...arr];
        for (let i = 0; i < n; i++) {
            newArr.unshift(newArr.pop());
        }
        return newArr;
    }, []);

    const onPressTile = useCallback((pitch, time) => {
        if (editMode == "draw" || editMode == "erase") {
            const newRoll = [...roll];
            newRoll[pitch * nTimeSteps + time] = editMode == "draw" ? 1 : 0;
            setRoll(newRoll);
        }
    }, [roll, nTimeSteps, editMode, setRoll]);

    const renderTile = useCallback((pitch, time) => {

        let isSelected = mask[pitch * nTimeSteps + time] == 1;
        let isOn = roll[pitch * nTimeSteps + time] == 1;
        let isAccent = time % 4 == 0;
        let isBeingPlayed = time == timeStep;
        let isRoot = pitch % scale.length == 0;

        return (
            <div 
                key={pitch * nTimeSteps + time}
                data-key={pitch * nTimeSteps + time}
                className="selectable"
                onMouseDown={() => onPressTile(pitch, time)}
                onMouseEnter={(e) => {
                    if (e.buttons == 1) {
                        onPressTile(pitch, time);
                    }
                }}
                style={{
                    boxSizing: "border-box",
                    width: "100%",
                    height: "100%",
                    margin: 0,
                    opacity: !isOn ? (isAccent || isRoot ? 0.1 : 0.05) : 1.0,
                    backgroundColor: isSelected ? "teal" : "black",
                    border: isBeingPlayed ? "1px solid gray" : "1px solid darkgray",
                    transition: "transform 0.3s ease-out",
                    transform: (isBeingPlayed & isOn) ? "scale(1.1, 1.4)" : "scale(1.0, 1.0)",
                    animation: (isSelected && modelIsBusy) ? `pulse-animation ${0.5 + Math.random() * 3}s infinite alternate` : "none"
                }}
            />
        )
    }, [mask, roll, nTimeSteps, timeStep, scale, onPressTile, modelIsBusy]);

    const children = (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%"}}>
            {[...pitchRange.reverse(), "set_start"].map((pitch) =>
                <div key={pitch} style={{ display: "flex", flexDirection: "row", width: "100%", height: "100%"}}>
                    {timeRange.map((time) => {
                        return (pitch !== "set_start" ?
                            renderTile(pitch, time)
                            :
                            <React.Fragment key={time}>
                                <div 
                                    key={time} 
                                    id={`set-start-${time}`}
                                    style={{
                                        boxSizing: "border-box",
                                        width: "100%",
                                        height: "100%",
                                        margin: 0,
                                        border: "1px solid white",
                                        backgroundColor: "gray"
                                    }}
                                    onClick={() => {
                                        const newRoll = rotateArray(roll, nTimeSteps - time);
                                        setRoll(newRoll);
                                        const newMask = rotateArray(mask, nTimeSteps - time);
                                        setMask(newMask);
                                        setTimeStep(step => (step + nTimeSteps - time) % nTimeSteps);
                                    }}
                                />
                                <Tooltip anchorId={`set-start-${time}`} place="bottom" type="dark" effect="solid" content={`set ${time} as start`}/>
                            </React.Fragment >
                        )
                    })}
                </div>
            )}
        </div >
    )

    return (
        <div style={{width:"100%", height:"100%"}}>
            {
                editMode == "select" ? (
                    <SelectionArea
                        className="container"
                        onStart={onStart}
                        onMove={onMove}
                        selectables=".selectable"
                    >
                        {children}
                    </SelectionArea>
                ) : (
                    <div style={{width:"100%", height:"100%"}}>
                        {children}
                    </div>
                )
            }
        </div>
    );
});

export default RollView;

// lightweight roll preview for playlist
const RollPreview = ({ nPitches, nTimeSteps, roll, scale, }) => {

    return (
        <div style={{ display: "flex", flexDirection: "column", width:"100%", height:"100%"}}>
            {[...Array(nPitches).keys()].reverse().map((pitch) =>
                <div key={pitch} style={{ display: "flex", flexDirection: "row", width: "100%", height: "100%" }}>
                    {[...Array(nTimeSteps).keys()].map((time) => 
                        <div key={pitch * nTimeSteps + time}
                            style={{
                                boxSizing: "border-box",
                                width: "100%",
                                height: "100%",
                                margin: 0,
                                opacity: roll[pitch * nTimeSteps + time] == 1 ? 1.0 : 0.0,
                                backgroundColor: scale[pitch % scale.length] == 1 ? "teal" : "black",
                                border: time == 0 ? "1px solid white" : "1px solid darkgray",
                                // transition: "transform 0.3s ease-out",
                            }
                            }
                        ></div>
                    )}
                </div>
            )}
        </div>
    )
}

export { RollPreview };





