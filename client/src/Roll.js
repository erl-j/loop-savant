import React from "react";
import RollView from "./RollView";

import Transport from "./Transport";
import { ScaleExp } from "tone";
import useRefState from "./useRefState";

const Roll = ({nPitches,nTimeSteps,roll,setRoll, mask, scale, modelIsBusy, tempo, synthParameters, isPlayingRef, output, setMask, pitchOffset, rollRef, editMode}) => {

    const [timeStep, setTimeStep, timeStepRef] = useRefState(0)

    return (
        <>
                <RollView setTimeStep={setTimeStep} nPitches={nPitches} nTimeSteps={nTimeSteps} roll={roll} setRoll={setRoll} timeStep={timeStep} mask={mask} setMask={setMask} editMode={editMode} modelIsBusy={modelIsBusy} scale={scale}></RollView>
                <Transport output={output} pitchOffset={pitchOffset} timeStepRef={timeStepRef} rollRef={rollRef} nPitches={nPitches} nTimeSteps={nTimeSteps} scale={scale} setTimeStep={setTimeStep} tempo={tempo} synthParameters={synthParameters} isPlayingRef={isPlayingRef} ></Transport>
        </>
    );
}

export default Roll;