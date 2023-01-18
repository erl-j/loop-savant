import * as React from 'react';
import { FaAdjust, FaCropAlt, FaDna, FaEraser, FaExpand, FaMagic, FaMinus, FaPencilAlt, FaPlus, FaTrashAlt } from "react-icons/fa";
import Select from 'react-select';
import { WebMidi } from "webmidi";
import "./index.css";
import Range from './Range';
import ToolbarButton from './ToolbarButton';

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
    setSynthParameters
}) => {


    const [midiOutputs, setMidiOutputs] = React.useState([])

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



    const selectStyles = {
        control: (baseStyles, state) => ({
            ...baseStyles,
            borderRadius: 0,
            fontSize: 12,
        }),
    }


    return (
        <div style={{ width: "100%", display: "flex", flexDirection: "row", justifyContent: "space-between", marginBottom: 32 }} >
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start", width: "38%" }}>
                <h1>Loop savant</h1>
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                    <div>
                        <h4>Draw</h4>
                        <ToolbarButton text="draw tool" icon={<FaPencilAlt></FaPencilAlt>} keyboardCharacter="d" onActivate={() => setEditMode("draw")} isActive={editMode == "draw"} />
                        <ToolbarButton text="erase tool" icon={<FaEraser></FaEraser>} keyboardCharacter="e" onActivate={() => setEditMode("erase")} isActive={editMode == "erase"} />
                    </div>
                    <div>
                        <h4>Select</h4>
                        <ToolbarButton text="select tool" icon={<FaCropAlt></FaCropAlt>} keyboardCharacter="s" onActivate={() => setEditMode("select")} isActive={editMode == "select"} />
                        <ToolbarButton text="select all" icon={<FaExpand></FaExpand>} keyboardCharacter="a" onActivate={selectAll} />
                        <ToolbarButton text="delete selected notes" icon={<FaTrashAlt></FaTrashAlt>} keyboardCharacter="Backspace" onActivate={deleteSelection} disabled={!transformsAreAvailable} />
                        <ToolbarButton text="invert selection" icon={<FaAdjust></FaAdjust>} keyboardCharacter="i" onActivate={invertSelection} />
                    </div>
                    <div>
                        <h4>Transform</h4>
                        <ToolbarButton text="generation" icon={<FaMagic></FaMagic>} keyboardCharacter="g" onActivate={runGeneration} disabled={!transformsAreAvailable} />
                        <ToolbarButton text="variation" icon={<FaDna></FaDna>} keyboardCharacter="v" onActivate={() => runVariation("all")} disabled={!transformsAreAvailable} />
                        <ToolbarButton text="sparser" icon={<FaMinus></FaMinus>} keyboardCharacter="n" onActivate={() => runVariation("sparser")} disabled={!transformsAreAvailable} />
                        <ToolbarButton text="denser" icon={<FaPlus></FaPlus>} keyboardCharacter="m" onActivate={() => runVariation("denser")} disabled={!transformsAreAvailable} />
                    </div>
                </div>
            </div>
            <div style={{ width: "12.5%" }}>
                <h4>AI</h4>
                <Range name="# steps" description="set tempo in bpm" type="range" min="1" max="30" step="1" value={nSteps} onChange={(e) => setNSteps(e)}></Range>
                <Range name="temp." displayValue={temperature.toFixed(2)} description="set temperature" type="range" min="0.0" max="2.0" step="0.01" value={temperature} onChange={(e) => setTemperature(e)}></Range>
                <Range name="activity" displayValue={activityBias.toFixed(2)} description="set activity bias" type="range" min="-2.0" max="2.0" step="0.01" value={activityBias} onChange={(e) => setActivityBias(e)}></Range>
            </div>
            {/* <div>
                    <input type="range" min="0.05" max="1.0" step="0.01" value={variationStrength} onChange={(e) => setVariationStrength(e)}></input>
                    <span>variationStrength: {variationStrength.toFixed(2)}</span>
                </div> */}

            <div style={{ width: "12.5%" }}>
                <h4>Playback</h4>
                <Range name="tempo" displayValue={tempo + "bpm"} description="set tempo in bpm" type="range" min="30" max="300" step="1" value={tempo} onChange={(e) => setTempo(e)}></Range>
                <Range name="pitch" displayValue={pitchOffset > 0 ? "+" + pitchOffset : pitchOffset} description="transpose output" type="range" min="-24" max="24" step="1" value={pitchOffset} onChange={(e) => setPitchOffset(e)}></Range>
                {midiOutputs.length > 0 &&
                    <div>
                        <span>output</span>
                        <Select styles={selectStyles} isSearchable={false} defaultValue={midiOptions[0]} options={midiOptions} onChange={(e) => setOutput(e.value)}></Select>
                    </div>
                }
            </div>
            {output === "built-in" &&
                <>
                    <div style={{ width: "12.5%" }}>
                        <h4>Synth</h4>
                        <Range name="volume" min={-20} max={0} step={0.01} value={synthParameters.volume} onChange={(value) => {
                            setSynthParameters({ ...synthParameters, volume: value })
                        }} />
                        <Range name="attack" min={0.01} max={1} step={0.01} value={synthParameters.envelope.attack} onChange={(value) => {
                            setSynthParameters({ ...synthParameters, envelope: { ...synthParameters.envelope, attack: value } })
                        }} />
                        <Range name="sustain" min={0.01} max={1} step={0.01} value={synthParameters.envelope.sustain} onChange={(value) => {
                            setSynthParameters({ ...synthParameters, envelope: { ...synthParameters.envelope, sustain: value } })
                        }} />
                    </div>
                    <div style={{ width: "12.5%" }}>
                        <h4>⚘</h4>
                        <Range name="decay" min={0.01} max={1} step={0.01} value={synthParameters.envelope.decay} onChange={(value) => {
                            setSynthParameters({ ...synthParameters, envelope: { ...synthParameters.envelope, decay: value } })
                        }} />
                        <Range name="release" min={0.01} max={1} step={0.01} value={synthParameters.envelope.release} onChange={(value) => {
                            setSynthParameters({ ...synthParameters, envelope: { ...synthParameters.envelope, release: value } })
                        }} />
                        <div>
                            <span>waveform</span>
                            <Select styles={selectStyles} options={waveformOptions} value={waveformOptions.find(option => option.value === synthParameters.oscillator.type)} onChange={(option) => {
                                setSynthParameters({ ...synthParameters, oscillator: { ...synthParameters.oscillator, type: option.value } })
                            }} />
                        </div>
                    </div>
                </>
            }

        </div >

    )
}

export default Toolbar;