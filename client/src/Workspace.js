import * as _ from "lodash";
import React from "react";
import { useLocalStorage } from "usehooks-ts";
import Toolbar from "./Toolbar";

import {
    MIN_NOTE,
    MODEL_PITCHES, MODEL_TIMESTEPS, SCALE, N_SCALE_PITCHES,
} from "./constants";
import exportMIDI from "./exportMIDI";
import useRefState from "./useRefState";
import { fullToScale, scaleToFull } from "./utils";
import Playlist from "./Playlist";
import { collection, doc, setDoc, getDoc, getDocs, query } from "firebase/firestore";
import { db } from "./firebase.js";
import { serverTimestamp } from "firebase/firestore";
import Roll from "./Roll";
import { generateRandomName } from "./words";

const defaultSynthParameters = {
    oscillator: {
        type: "sine"
    },
    envelope: {
        attack: 0.01,
        release: 0.05,
        sustain: 0.5,
    },
    volume: -12
}

const Workspace = ({ model }) => {

    const [user, setUser] = useLocalStorage("user", null);

    const [postChangeCounter, setPostChangeCounter] = React.useState(0)

    const saveLoop = async () => {
        let loopObject = {
            roll: roll,
            pitchOffset: pitchOffset,
            bpm: tempo,
            title: title,
            createdAt: serverTimestamp(),
            synthParameters: synthParameters
        }
        const docRef = await doc(collection(db, "users", user.uid, "loops"));
        await setDoc(docRef, loopObject);
        setPostChangeCounter(postChangeCounter + 1)
    }

    const setLoop = (loop) => {
        setRoll(loop.roll)
        setPitchOffset(loop.pitchOffset)
        setTempo(loop.bpm)
        if (loop.synthParameters) {
            setSynthParameters(loop.synthParameters)
        }
        else {
            setSynthParameters(defaultSynthParameters)
        }
        setTitle(loop.title)
    }

    const [isPlaying, setIsPlaying, isPlayingRef] = useRefState(true)

    const [cachedLoop, setCachedLoop] = useLocalStorage("loop", undefined)
    const [roll, setRoll, rollRef] = useRefState(new Array(N_SCALE_PITCHES * MODEL_TIMESTEPS).fill(0))
    const [title, setTitle] = React.useState("Untitled")
    const [mask, setMask] = React.useState([...new Array(N_SCALE_PITCHES * MODEL_TIMESTEPS).fill(1)])

    const [nSteps, setNSteps] = React.useState(model.defaults.nSteps)
    const [temperature, setTemperature] = React.useState(model.defaults.temperature)
    const [activityBias, setActivityBias] = React.useState(model.defaults.activityBias)
    const [editMode, setEditMode] = React.useState("select");
    const [variationStrength, setVariationStrength] = React.useState(0.25)
    const [output, setOutput] = useLocalStorage("output", "built-in")
    const [tempo, setTempo] = React.useState(160)
    const [pitchOffset, setPitchOffset] = React.useState(0)
    const [modelIsBusy, setModelIsBusy] = React.useState(false)
    const [synthParameters, setSynthParameters] = React.useState(
        defaultSynthParameters
    )

      // effect that reads roll from local storage
      React.useEffect(() => {
        if(cachedLoop){
            setRoll(cachedLoop.roll)
            setPitchOffset(cachedLoop.pitchOffset)
            setTempo(cachedLoop.bpm)
            setTitle(cachedLoop.title)
            if (cachedLoop.synthParameters) {
                setSynthParameters(cachedLoop.synthParameters)
            }
            else {
                setSynthParameters(defaultSynthParameters)
            }
        }
    }, [])

    React.useEffect(() => {
            setCachedLoop({
                roll: roll,
                pitchOffset: pitchOffset,
                title: title,
                bpm: tempo,
                synthParameters: synthParameters
            })
    }, [roll, pitchOffset, tempo, title, synthParameters])

    const exportRollAsMIDI = () => {
        exportMIDI(_.chunk(scaleToFull(roll, SCALE, MODEL_PITCHES, MODEL_TIMESTEPS), MODEL_TIMESTEPS), pitchOffset + MIN_NOTE, tempo)
    }

    const runGeneration = () => {
        setModelIsBusy(true)
        console.log("running generation")
        let fullMask = scaleToFull(mask, SCALE, MODEL_PITCHES, MODEL_TIMESTEPS)
        let fullRoll = scaleToFull(roll, SCALE, MODEL_PITCHES, MODEL_TIMESTEPS)
        model.generate(fullRoll, fullMask, nSteps, temperature, activityBias).then(infilledRoll => {
            infilledRoll = fullToScale(infilledRoll, SCALE, MODEL_PITCHES, MODEL_TIMESTEPS)
            setRoll(infilledRoll)
            setModelIsBusy(false)
        }
        )
    }

    const runVariation = (mode) => {

        setModelIsBusy(true)
        let fullMask = scaleToFull(mask, SCALE, MODEL_PITCHES, MODEL_TIMESTEPS)
        let fullRoll = scaleToFull(roll, SCALE, MODEL_PITCHES, MODEL_TIMESTEPS)
        let nSteps = (mode == "all") ? 5 : 2
        model.regenerate(fullRoll, fullMask, nSteps, temperature, activityBias, variationStrength, mode).then(infilledRoll => {
            infilledRoll = fullToScale(infilledRoll, SCALE, MODEL_PITCHES, MODEL_TIMESTEPS)
            setRoll(infilledRoll)
            setModelIsBusy(false)
        })
    }

    const selectAll = () => {
        setMask(new Array(N_SCALE_PITCHES * MODEL_TIMESTEPS).fill(1))
        setEditMode("select")
    }

    const invertSelection = () => {
        let currentMask = [...mask]
        let newMask = new Array(currentMask.length).fill(0);
        newMask.forEach((e, i) => {
            newMask[i] = 1 - currentMask[i]
        })
        setMask(newMask)
        setEditMode("select")
    }

    const resetSelection = () => {
        setMask(new Array(N_SCALE_PITCHES * MODEL_TIMESTEPS).fill(0))
    }

    React.useEffect(() => {
        if (editMode == "draw") {
            resetSelection()
        }
        if (editMode == "erase") {
            resetSelection()
        }
    }, [editMode])

    const deleteSelection = () => {
        let newRoll = [...roll]
        newRoll = newRoll.map((x, i) => {
            if (mask[i]) {
                return 0
            }
            else {
                return x
            }
        })
        setRoll(newRoll)
    }

    let n_masked = mask.reduce((a, b) => a + b, 0)
    return (
        <div style={{ display: "flex", justifyContent: "space-evenly", height: "90%", flexDirection: "row", width: "100%" }} >
            <div style={{ width: "25%" }}>
                <Playlist setPostChangeCounter={setPostChangeCounter} setLoop={setLoop} postChangeCounter={postChangeCounter} scale={SCALE} nPitches={N_SCALE_PITCHES} nTimesteps={MODEL_TIMESTEPS} ></Playlist>
            </div>
            <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "70%" }}>
                <div>
                    {/* editable title */}
                    <Toolbar editMode={editMode} setEditMode={setEditMode}
                        nSteps={nSteps} setNSteps={setNSteps}
                        temperature={temperature} setTemperature={setTemperature}
                        activityBias={activityBias} setActivityBias={setActivityBias}
                        transformsAreAvailable={n_masked > 0}
                        runGeneration={runGeneration}
                        runVariation={runVariation}
                        deleteSelection={deleteSelection}
                        invertSelection={invertSelection}
                        setVariationStrength={setVariationStrength}
                        variationStrength={variationStrength}
                        output={output}
                        setOutput={setOutput}
                        tempo={tempo}
                        setTempo={setTempo}
                        pitchOffset={pitchOffset}
                        setPitchOffset={setPitchOffset}
                        selectAll={selectAll}
                        modelIsBusy={modelIsBusy}
                        synthParameters={synthParameters}
                        setSynthParameters={setSynthParameters}
                        exportRollAsMIDI={exportRollAsMIDI}
                        isPlaying={isPlaying}
                        setIsPlaying={setIsPlaying}
                        saveLoop={saveLoop}
                        title={title}
                        setTitle={setTitle}
                        rollComponent={ <Roll setMask={setMask} editMode={editMode} rollRef={rollRef} pitchOffset={pitchOffset} nPitches={N_SCALE_PITCHES} nTimeSteps={MODEL_TIMESTEPS} roll={roll} setRoll={setRoll} mask={mask} scale={SCALE} modelIsBusy={modelIsBusy} tempo={tempo} synthParameters={synthParameters} isPlayingRef={isPlayingRef} output={output}></Roll>}
                    ></Toolbar>
                </div>
                {/* <div style={{ aspectRatio:"5 / 3", width:"70%"}} >
                   
                </div> */}
            </div >
        
        </div >
    );

}

export default Workspace;