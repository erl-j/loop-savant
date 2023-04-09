import * as _ from 'lodash';
import * as ort from 'onnxruntime-web';
import { MODEL_PITCHES, MODEL_PARAMS, MODEL_TIMESTEPS } from './constants.js';
import { softmax, sample_categorical } from './utils.js';

const CLM_DOCUMENT_LENGTH = 128;
const CLM_N_DURATIONS = 64;
const CLM_N_PITCHES = 36;
const ATTRIBUTES = ["pitch", "onset", "duration"];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26, 28, 29, 31, 33, 35];

class CLModel {
    constructor(model_params) {
        this.model_path = model_params.path
        this.defaults = model_params.defaults;
    }

    async initialize() {
        ort.env.wasm.proxy = true;
        this.session = await ort.InferenceSession.create(process.env.PUBLIC_URL + "/" + this.model_path,
            { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }
            // { executionProviders: ['webgl'], enableProfiling: true }
        );
        this.test_run(2);
    };

    async forward(superposition) {
        // console.log("superposition", superposition);
        // console.assert(superposition.pitch.length == 1 * CLM_DOCUMENT_LENGTH * (CLM_N_PITCHES + 1));
        // console.assert(superposition.onset.length == 1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1));
        // console.assert(superposition.duration.length == 1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1));

        // generate model input
        const feeds = {
            pitch: new ort.Tensor("float32", superposition["pitch"], [1, CLM_DOCUMENT_LENGTH, CLM_N_PITCHES + 1]),
            onset: new ort.Tensor("float32", superposition["onset"], [1, CLM_DOCUMENT_LENGTH, CLM_N_DURATIONS + 1]),
            duration: new ort.Tensor("float32", superposition["duration"], [1, CLM_DOCUMENT_LENGTH, CLM_N_DURATIONS + 1]),
        };
        let results = await this.session.run(feeds);
        return { pitch: results.pitch_logits.data, onset: results.onset_logits.data, duration: results.duration_logits.data };
    }

    async test_run(n_iterations = 1) {
        // test forward pass

        let execution_times = [];
        for (let i = 0; i < n_iterations; i++) {
            let pitch = new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_PITCHES + 1)).fill(1);
            let onset = new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1)).fill(1);
            let duration = new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1)).fill(1);
            let superposition = { pitch: pitch, onset: onset, duration: duration };

            console.log(`Iteration ${i + 1} of ${n_iterations}`);
            const start = new Date().getTime();
            let y = await this.forward(superposition);
            const end = new Date().getTime();
            console.log(`Execution time: ${end - start} ms`);
            execution_times.push(end - start);
        }
        console.log(`Average execution time over ${n_iterations} iterations: ${_.mean(execution_times)} ms`);
    }

    flat_roll_to_note_sequence(flat_roll) {
        // flat_roll: timesteps * pitches
        // returns: [{ pitch: 0, onset: 0, duration: 0 }, ...]
        let note_sequence = [];

        // iterate over flat_roll, track note onsets and offsets, 
        // compute onset, pitch and duration and add to note_sequence
        for (let pitch = 0; pitch < MODEL_PITCHES; pitch++) {
            let note_on = false;
            for (let time = 0; time < MODEL_TIMESTEPS; time++) {
                if (flat_roll[time * MODEL_PITCHES + pitch] > 0.5) {
                    if (!note_on) {
                        note_on = true;
                        note_sequence.push({ pitch: pitch, onset: time });
                    }
                } else {
                    if (note_on) {
                        note_on = false;
                        note_sequence[note_sequence.length - 1].duration = time - note_sequence[note_sequence.length - 1].onset;
                    }
                }
            }
            if (note_on) {
                note_on = false;
                note_sequence[note_sequence.length - 1].duration = MODEL_TIMESTEPS - note_sequence[note_sequence.length - 1].onset;
            }
        }
        return note_sequence;
    }


    async regenerate(x_in, mask_in, n_steps, temperature, activityBias, mask_rate, mode = "all") {
    }

    async sample(superposition, temperature, nStepsToSample) {
        // iterate over document and sample pitch, onset, duration up to nStepsToSample
        for (let i = 0; i < nStepsToSample; i++) {
            // iterate over pitch, onset, duration
            for (let j = 0; j < 3; j++) {
                let logits = await this.forward(superposition);
                let logits_flat = logits[ATTRIBUTES[j]].slice(i * (CLM_N_PITCHES + 1), (i + 1) * (CLM_N_PITCHES + 1));
                let probs = softmax(logits_flat, temperature);
                let sample = sample_categorical(probs);
                superposition[ATTRIBUTES[j]].fill(0, i * (CLM_N_PITCHES + 1), (i + 1) * (CLM_N_PITCHES + 1));
                superposition[ATTRIBUTES[j]][i * (CLM_N_PITCHES + 1) + sample] = 1;
            }
        }
        return {
            pitch: superposition.pitch.slice(0, nStepsToSample * (CLM_N_PITCHES + 1)),
            onset: superposition.onset.slice(0, nStepsToSample * (CLM_N_DURATIONS + 1)),
            duration: superposition.duration.slice(0, nStepsToSample * (CLM_N_DURATIONS + 1))
        }
    }

    prepare_superposition(pitches_allowed = "*", onsets_allowed = "*", durations_allowed = "*", n_active_notes = ">0") {

        if (pitches_allowed == "*") {
            pitches_allowed = _.range(CLM_N_PITCHES);
        }
        if (onsets_allowed == "*") {
            onsets_allowed = _.range(CLM_N_DURATIONS);
        }
        if (durations_allowed == "*") {
            durations_allowed = _.range(CLM_N_DURATIONS);
        }
        let step_pitches = Array((CLM_N_PITCHES + 1)).fill(0);
        for (let i = 0; i < pitches_allowed.length; i++) {
            step_pitches[pitches_allowed[i] + 1] = 1;
        }
        let step_onsets = Array((CLM_N_DURATIONS + 1)).fill(0);
        for (let i = 0; i < onsets_allowed.length; i++) {
            step_onsets[onsets_allowed[i] + 1] = 1;
        }
        let step_durations = Array((CLM_N_DURATIONS + 1)).fill(0);
        for (let i = 0; i < durations_allowed.length; i++) {
            step_durations[durations_allowed[i] + 1] = 1;
        }

        // repeat CLM_DOCUMENT_LENGTH times
        let pitches = Array(CLM_DOCUMENT_LENGTH).fill(step_pitches).flat();
        let onsets = Array(CLM_DOCUMENT_LENGTH).fill(step_onsets).flat();
        let durations = Array(CLM_DOCUMENT_LENGTH).fill(step_durations).flat();

        // if n_active_notes is a number, set that number of notes to be active
        // a note is active if its pitch, onset and duration values are all defined, i.e. if their 0th index is 0.
        // a note is inactive if its pitch, onset and duration values are all undefined, i.e. if their 0th index is 1 and all others are 0
        if (typeof n_active_notes == "number") {
            // if index is greater than n_active_notes, set all values to 0 except the first one
            for (let i = 0; i < CLM_DOCUMENT_LENGTH; i++) {
                if (i <= n_active_notes) {
                    pitches[i * (CLM_N_PITCHES + 1)] = 0;
                    onsets[i * (CLM_N_DURATIONS + 1)] = 0;
                    durations[i * (CLM_N_DURATIONS + 1)] = 0;
                } else {
                    if (i > n_active_notes) {
                        pitches.fill(0, i * (CLM_N_PITCHES + 1), (i + 1) * (CLM_N_PITCHES + 1));
                        pitches[i * (CLM_N_PITCHES + 1)] = 1;
                        onsets.fill(0, i * (CLM_N_DURATIONS + 1), (i + 1) * (CLM_N_DURATIONS + 1));
                        onsets[i * (CLM_N_DURATIONS + 1)] = 1;
                        durations.fill(0, i * (CLM_N_DURATIONS + 1), (i + 1) * (CLM_N_DURATIONS + 1));
                        durations[i * (CLM_N_DURATIONS + 1)] = 1;
                    }
                }
            }
        }
        let superposition = {
            pitch: pitches,
            onset: onsets,
            duration: durations
        }
        return superposition;
    }

    superposition_to_note_sequence(superposition) {
        let note_sequence = [];
        let n_notes = superposition["pitch"].length / (CLM_N_PITCHES + 1)
        for (let i = 0; i < n_notes; i++) {
            let pitch = _.indexOf(superposition.pitch.slice(i * (CLM_N_PITCHES + 1), (i + 1) * (CLM_N_PITCHES + 1)), 1) - 1;
            let onset = _.indexOf(superposition.onset.slice(i * (CLM_N_DURATIONS + 1), (i + 1) * (CLM_N_DURATIONS + 1)), 1) - 1;
            let duration = _.indexOf(superposition.duration.slice(i * (CLM_N_DURATIONS + 1), (i + 1) * (CLM_N_DURATIONS + 1)), 1) - 1;
            if (pitch != -1 && onset != -1 && duration != -1) {
                let note = {
                    pitch: pitch,
                    onset: onset,
                    duration: duration
                }
                note_sequence.push(note);
            }
        }
        return note_sequence;
    }

    note_sequence_to_flat_roll(note_sequence) {
        let flat_roll = Array(MODEL_PITCHES * MODEL_TIMESTEPS).fill(0);
        for (let i = 0; i < note_sequence.length; i++) {
            let note = note_sequence[i];
            let pitch = note.pitch;
            let onset = note.onset // 2;
            let duration = note.duration // 2;
            flat_roll.fill(1, pitch * MODEL_TIMESTEPS + onset, pitch * MODEL_TIMESTEPS + onset + duration);
        }
        return flat_roll;
    }

    async generate(x_in, mask_in, n_steps, temperature, activityBias) {
        let superposition = {
            pitch: new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_PITCHES + 1)).fill(1),
            onset: new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1)).fill(1),
            duration: new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1)).fill(1),
        }
        // make a range of 0 to 8
        let every_other = _.range(0, CLM_N_DURATIONS-2, 2);

        let n_notes = 64;

        superposition = this.prepare_superposition(MAJOR_SCALE, every_other, every_other, n_notes);
        superposition = await this.sample(superposition, temperature, n_notes);

        // convert to note sequence
        let note_sequence = this.superposition_to_note_sequence(superposition);
        let flat_roll = this.note_sequence_to_flat_roll(note_sequence);
        console.log(flat_roll);
        return flat_roll;
    }
}

export default CLModel;