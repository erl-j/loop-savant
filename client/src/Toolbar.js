import * as React from 'react';
import { FaAdjust, FaCropAlt, FaDna, FaDownload, FaEraser, FaExpand, FaHeart, FaMagic, FaMinus, FaPencilAlt, FaPlay, FaPlus, FaSquare, FaTrashAlt } from "react-icons/fa";
import { BiSelection } from "react-icons/bi";
import { AiOutlineFullscreen } from "react-icons/ai";
import Select from 'react-select';
import { WebMidi } from "webmidi";
import DropDown from './Generics/DropDown';
import "./index.css";
import Range from './Generics/Range';
import ToolbarButton from './ToolbarButton';
import XYController from './XYController';

const Toolbar = ({
    setEditMode,
    editMode,
    transformsAreAvailable,
    runGeneration,
    runVariation,
    nSteps,
    temperature,
    activityBias,
    setNSteps,
    setActivityBias,
    setTemperature,
    deleteSelection,
    invertSelection,
    variationStrength,
    setVariationStrength,
    setOutput,
    output,
    tempo,
    setTempo,
    pitchOffset,
    setPitchOffset,
    selectAll,
    modelIsBusy,
    synthParameters,
    setSynthParameters,
    exportRollAsMIDI,
    isPlaying,
    setIsPlaying,
    saveLoop,
    title,
    setTitle,
    rollComponent
}) => {

    const [midiOutputs, setMidiOutputs] = React.useState([])
    const [firstGenerationIsDone, setFirstGenerationIsDone] = React.useState(false)

    React.useEffect(() => {
        if (modelIsBusy) {
            setFirstGenerationIsDone(true)
        }
    }, [modelIsBusy])

    React.useEffect(() => {

        WebMidi.enable((err) => {
            if (err) {
                console.log("WebMidi could not be enabled.", err);
            } else {
                console.log("WebMidi enabled!");
                setMidiOutputs(WebMidi.outputs)
            }
        });
    }
        , [])

    let midiOptions = [{ value: "built-in", label: "built-in" }, ...midiOutputs.map((output) => {
        return { value: output.name, label: output.name }
    }),]

    const waveformOptions = [
        { value: 'sine', label: 'sine' },
        { value: 'square', label: 'square' },
        { value: 'triangle', label: 'triangle' },
        { value: 'sawtooth', label: 'sawtooth' },
    ]

    const editingButtons = <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <div>
                <ToolbarButton text="draw tool" icon={<FaPencilAlt></FaPencilAlt>} keyboardCharacter="d" onActivate={() => setEditMode("draw")} isActive={editMode == "draw"} />
                <ToolbarButton text="erase tool" icon={<FaEraser></FaEraser>} keyboardCharacter="e" onActivate={() => setEditMode("erase")} isActive={editMode == "erase"} />
            </div>
            <div>
                <ToolbarButton text="select tool" icon={<BiSelection></BiSelection>} keyboardCharacter="s" onActivate={() => setEditMode("select")} isActive={editMode == "select"} />
                <ToolbarButton text="select all" icon={<AiOutlineFullscreen></AiOutlineFullscreen>} keyboardCharacter="a" onActivate={selectAll} />
                <ToolbarButton text="delete selected notes" icon={<FaTrashAlt></FaTrashAlt>} keyboardCharacter="Backspace" onActivate={deleteSelection} disabled={!transformsAreAvailable} />
                <ToolbarButton text="invert selection" icon={<FaAdjust></FaAdjust>} keyboardCharacter="i" onActivate={invertSelection} />
            </div>
            <div>
                <ToolbarButton text="generation" icon={<FaMagic></FaMagic>} keyboardCharacter="g" onActivate={runGeneration} disabled={!transformsAreAvailable} />
                <ToolbarButton text="variation" icon={<FaDna></FaDna>} keyboardCharacter="v" onActivate={() => runVariation("all")} disabled={!transformsAreAvailable} />
                <ToolbarButton text="sparser" icon={<FaMinus></FaMinus>} keyboardCharacter="n" onActivate={() => runVariation("sparser")} disabled={!transformsAreAvailable} />
                <ToolbarButton text="denser" icon={<FaPlus></FaPlus>} keyboardCharacter="m" onActivate={() => runVariation("denser")} disabled={!transformsAreAvailable} />
            </div>
        </div>
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <ToolbarButton text={isPlaying ? "stop" : "play"} icon={isPlaying ? <FaSquare></FaSquare> : <FaPlay></FaPlay>} keyboardCharacter={"space"} onActivate={() => setIsPlaying(!isPlaying)} />
            <Range label="tempo" displayValue={tempo + "bpm"} description="set tempo in bpm" type="range" min="30" max="300" step="1" value={tempo} onChange={(e) => setTempo(e)}></Range>
            <Range label="pitch" displayValue={pitchOffset > 0 ? "+" + pitchOffset : pitchOffset} description="transpose output" type="range" min="-24" max="24" step="1" value={pitchOffset} onChange={(e) => setPitchOffset(e)}></Range>
        </div>
    </div>
    return (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
            {/* {!firstGenerationIsDone ? <span style={{ animation: "glow 1s linear infinite" }}>To start, press <b>a</b> (select all) followed by <b>g</b> (generate)</span> : ""} */}
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                <ToolbarButton text="like" icon={<FaHeart></FaHeart>} onActivate={saveLoop} />
                <ToolbarButton text="export MIDI" icon={<FaDownload></FaDownload>} keyboardCharacter={"p"} onActivate={exportRollAsMIDI} />
                <input style={{ fontSize: "1.5em", width: "100%" }} value={title} onChange={(e) => setTitle(e.target.value)}></input>
            </div>
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
            </div>
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                <div style={{ width: "70%" }}>
                    {editingButtons}
                    <div style={{ aspectRatio: "5 / 3", width: "100%" }} >
                        {rollComponent}
                    </div>
                </div>
                <div style={{ width: "20vw", margin:32}}>
                    <div style={{ width: "100%", height: "30vh" }}>
                        <XYController setX={setActivityBias} setY={setTemperature} xValue={activityBias} yValue={temperature} xSettings={{ min: 0.0, max: 2.0, step: 0.01 }} ySettings={{ min: -2.0, max: 2.0, step: 0.01 }}></XYController>
                    </div>
                    <Range label="speed <-> precision" description="set speed/precision" type="range" min="1" max="30" step="1" value={nSteps} onChange={(e) => setNSteps(e)}></Range>
                </div>
            </div>
            <div style={{ width: "22%" }}>
                {midiOutputs.length > 0 &&
                    <DropDown label="output" options={midiOptions} value={output} onChange={(e) => setOutput(e)}></DropDown>
                }
            </div>
            <>
                <div style={{ width: "22%", display: output !== "built-in" ? "none" : "" }}>
                    <DropDown label="waveform" value={synthParameters.oscillator.type} options={waveformOptions} onChange={(value) => {
                        setSynthParameters({
                            ...synthParameters, oscillator: { ...synthParameters.oscillator, type: value }
                        })
                    }
                    } />
                    <Range label="attack" min={0.01} max={1} step={0.01} value={synthParameters.envelope.attack} onChange={(value) => {
                        setSynthParameters({ ...synthParameters, envelope: { ...synthParameters.envelope, attack: value } })
                    }} />
                    <Range label="sustain" min={0.01} max={1} step={0.01} value={synthParameters.envelope.sustain} onChange={(value) => {
                        setSynthParameters({ ...synthParameters, envelope: { ...synthParameters.envelope, sustain: value } })
                    }} />
                </div>
                <div style={{ width: "22%", display: output !== "built-in" ? "none" : "" }}>
                    <Range label="volume" min={-20} max={0} step={0.01} value={synthParameters.volume} onChange={(value) => {
                        setSynthParameters({ ...synthParameters, volume: value })
                    }} />
                    <Range label="decay" min={0.01} max={1} step={0.01} value={synthParameters.envelope.decay} onChange={(value) => {
                        setSynthParameters({ ...synthParameters, envelope: { ...synthParameters.envelope, decay: value } })
                    }} />
                    <Range label="release" min={0.01} max={1} step={0.01} value={synthParameters.envelope.release} onChange={(value) => {
                        setSynthParameters({ ...synthParameters, envelope: { ...synthParameters.envelope, release: value } })
                    }} />
                </div>
            </>
        </div >

    )
}

export default Toolbar;