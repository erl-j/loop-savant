import * as _ from 'lodash';
import * as ort from 'onnxruntime-web';
import { MODEL_PITCHES, MODEL_PARAMS, MODEL_TIMESTEPS } from './constants.js';
import { softmax } from './utils.js';

const CLM_DOCUMENT_LENGTH = 128;
const CLM_N_DURATIONS = 64;
const CLM_N_PITCHES = 36;
const ATTRIBUTES = ["pitch", "onset", "duration"];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

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
        this.test_run(20);
    };

    async forward(superposition) {
        // assert(pitch.length == 1 * CLM_DOCUMENT_LENGTH * (CLM_N_PITCHES + 1));
        // assert(onset.length == 1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1));
        // assert(duration.length == 1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1));

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
        let pitch = new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_PITCHES + 1)).fill(1);
        let onset = new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1)).fill(1);
        let duration = new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1)).fill(1);

        let execution_times = [];
        for (let i = 0; i < n_iterations; i++) {
            console.log(`Iteration ${i + 1} of ${n_iterations}`);
            const start = new Date().getTime();
            let y = await this.forward(pitch, onset, duration);
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
        for (let i = 0; i < CLM_DOCUMENT_LENGTH; i++) {
            // iterate over pitch, onset, duration
            for (let j = 0; j < 3; j++) {
                let logits = await this.forward(superposition);
                let logits_flat = logits[ATTRIBUTES[j]].slice(i * (CLM_N_PITCHES + 1), (i + 1) * (CLM_N_PITCHES + 1));
                let probs = softmax(logits_flat, temperature);
                let sample = _.sample(_.range(probs.length), 1, probs)[0];
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

    async prepare_superposition(pitches_allowed = "*", onsets_allowed = "*", durations_allowed = "*", n_active_notes = ">0") {

        if (pitches_allowed == "*") {
            pitches_allowed = _.range(CLM_N_PITCHES);
        }
        if (onsets_allow == "*") {
            onsets_allowed = _.range(CLM_N_DURATIONS);
        }
        if (durations_allow == "*") {
            durations_allowed = _.range(CLM_N_DURATIONS);
        }
        let step_pitches = new Float32Array(CLM_DOCUMENT_LENGTH * (CLM_N_PITCHES + 1)).fill(0);
        for (let i = 0; i < pitches.length; i++) {
            step_pitches[i * (CLM_N_PITCHES + 1) + pitches[i] + 1] = 1;
        }
        let step_durations = new Float32Array(CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1)).fill(0);
        for (let i = 0; i < durations.length; i++) {
            step_durations[i * (CLM_N_DURATIONS + 1) + durations[i] + 1] = 1;
        }
        let step_onsets = new Float32Array(CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1)).fill(0);
        for (let i = 0; i < onsets.length; i++) {
            step_onsets[i * (CLM_N_DURATIONS + 1) + onsets[i] + 1] = 1;
        }

        // repeat CLM_DOCUMENT_LENGTH times
        let pitches = step_pitches.repeat(CLM_DOCUMENT_LENGTH);
        let durations = step_durations.repeat(CLM_DOCUMENT_LENGTH);
        let onsets = step_onsets.repeat(CLM_DOCUMENT_LENGTH);

        // if n_active_notes is a number, set that number of notes to be active
        // a note is active if its pitch, onset and duration values are all defined, i.e. if their 0th index is 0.
        // a note is inactive if its pitch, onset and duration values are all undefined, i.e. if their 0th index is 1 and all others are 0
        if (typeof n_active_notes == "number") {
            // if index is greater than n_active_notes, set all values to 0 except the first one
            for (let i = 0; i < CLM_DOCUMENT_LENGTH; i++) {
                if (i <= n_active_notes) {
                    pitches[i * (CLM_N_PITCHES + 1)] = 0;
                    durations[i * (CLM_N_DURATIONS + 1)] = 0;
                    onsets[i * (CLM_N_DURATIONS + 1)] = 0;
                } else {
                    if (i > n_active_notes) {
                        pitches.fill(0, i * (CLM_N_PITCHES + 1), (i + 1) * (CLM_N_PITCHES + 1));
                        pitches[i * (CLM_N_PITCHES + 1)] = 1;
                        durations.fill(0, i * (CLM_N_DURATIONS + 1), (i + 1) * (CLM_N_DURATIONS + 1));
                        durations[i * (CLM_N_DURATIONS + 1)] = 1;
                        onsets.fill(0, i * (CLM_N_DURATIONS + 1), (i + 1) * (CLM_N_DURATIONS + 1));
                        onsets[i * (CLM_N_DURATIONS + 1)] = 1;
                    }
                }
            }
        }
        return {
            pitch: pitches,
            onset: onsets,
            duration: durations
        }
    }

    async superposition_to_note_sequence(superposition) {
        let pitches_idx = _.chunk(superposition.pitch, CLM_N_PITCHES + 1);
        let onsetes_idx = _.chunk(superposition.onset, CLM_N_DURATIONS + 1);
        let durationes_idx = _.chunk(superposition.duration, CLM_N_DURATIONS + 1);



    async generate(x_in, mask_in, n_steps, temperature, activityBias) {
            superposition = {
                pitch: new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_PITCHES + 1)).fill(1),
                onset: new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1)).fill(1),
                duration: new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1)).fill(1),
            }
            // make a range of 0 to 8
            let every_other = _.range(0, CLM_N_DURATIONS, 2);

            let n_notes = 10;

            superposition = this.prepare_superposition(MAJOR_SCALE, every_other, every_other, n_notes);
            superposition = this.sample(superposition, temperature, n_notes);

            // convert to note sequence


        }
    }

        export default CLModel;