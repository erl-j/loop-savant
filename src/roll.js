import React from "react";
import * as Tone from "tone";
import useRefState from "./useRefState";

const N_PITCHES = 36;
const N_TIMESTEPS = 32;

const pitchRange = Array.from(Array(N_PITCHES).keys());
const timeRange = Array.from(Array(N_TIMESTEPS).keys());

const wrapTimeStep = (timeStep) => (timeStep + N_TIMESTEPS) % N_TIMESTEPS


const Roll = () => {
    const [roll, setRoll, rollRef] = useRefState(new Array(N_PITCHES * N_TIMESTEPS).fill(0))

    const synthRef = React.useRef(null);

    const [timeStep, setTimeStep, timeStepRef] = useRefState(0)

    React.useEffect(() => {
        let synths = [];
        pitchRange.forEach((pitch) => {
            const synth = new Tone.MonoSynth({ release: 0 }).toDestination();
            synths.push(synth);
            synthRef.current = synths;
        });
        Tone.Transport.scheduleRepeat((time) => {
            let currentTimeStep = timeStepRef.current;
            let previousTimeStep = wrapTimeStep(currentTimeStep - 1);
            let timeOffset = 0.005;
            for (let i = 0; i < N_PITCHES; i++) {
                let noteIsActive = rollRef.current[i * N_TIMESTEPS + currentTimeStep] == 1;
                let noteWasActive = rollRef.current[i * N_TIMESTEPS + previousTimeStep] == 1;
                if (noteIsActive && !noteWasActive) {
                    synthRef.current[i].triggerAttack(Tone.Frequency(i + 31, "midi").toNote(), time + timeOffset);
                }
                if (!noteIsActive && noteWasActive) {
                    synthRef.current[i].triggerRelease(time + timeOffset);
                }
            }
            setTimeStep((step) => (step + 1) % N_TIMESTEPS);
        }
            , "16n");

        Tone.start();
        Tone.Transport.start();
    }, [])

    return (
        <div style={{ display: "flex", flexDirection: "column" }} >
            {pitchRange.map((pitch) =>
                <div key={pitch} style={{ display: "flex", flexDirection: "row" }} >
                    {timeRange.map((time) => {
                        return (
                            <div key={time} onClick={() => {
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

                                style={{ width: 26, height: 16, margin: 0, backgroundColor: roll[pitch * N_TIMESTEPS + time] == 0 ? "red" : "black", borderRadius: timeStep == time ? 1 : 10 }}></div>
                        )
                    }
                    )}
                </div>
            )}
        </div>
    );
}

export default Roll;