import * as _ from 'lodash';
import * as ort from 'onnxruntime-web';
import { MODEL_PITCHES, MODEL_PARAMS, MODEL_TIMESTEPS } from './constants.js';
import { softmax } from './utils.js';
import { assert } from 'tone/build/esm/core/util/Debug.js';

const CLM_DOCUMENT_LENGTH = 128;
const CLM_N_DURATIONS = 64;
const CLM_N_PITCHES = 36;

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

    async forward(pitch, onset, duration) {
        // assert(pitch.length == 1 * CLM_DOCUMENT_LENGTH * (CLM_N_PITCHES + 1));
        // assert(onset.length == 1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1));
        // assert(duration.length == 1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1));

        // generate model input
        const feeds = {
            pitch: new ort.Tensor("float32", pitch, [1, CLM_DOCUMENT_LENGTH, CLM_N_PITCHES + 1]),
            onset: new ort.Tensor("float32", onset, [1, CLM_DOCUMENT_LENGTH, CLM_N_DURATIONS + 1]),
            duration: new ort.Tensor("float32", duration, [1, CLM_DOCUMENT_LENGTH, CLM_N_DURATIONS + 1]),
        };
        let results = await this.session.run(feeds);
        return { pitch_logits: results.pitch_logits.data, onset_logits: results.onset_logits.data, duration_logits: results.duration_logits.data };
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

    async generate(x_in, mask_in, n_steps, temperature, activityBias) {

    }
}

export default CLModel;