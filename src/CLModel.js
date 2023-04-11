import * as _ from 'lodash';
import * as ort from 'onnxruntime-web';
import { MODEL_PITCHES, MODEL_PARAMS, MODEL_TIMESTEPS, SCALE } from './constants.js';
import { softmax, sample_categorical, fullToScale } from './utils.js';
import { findRectangles, rectanglesToImage } from './findRectangles.js';
import { assert } from 'tone/build/esm/core/util/Debug.js';

const CLM_DOCUMENT_LENGTH = 128;
const CLM_N_DURATIONS = 64;
const CLM_N_PITCHES = 36;
const ATTRIBUTES = ["pitch", "onset", "duration"];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26, 28, 29, 31, 33, 35];
const PENTATONIC_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33];

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
        this.test_run(10);
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
            for(let t = 0; t < MODEL_TIMESTEPS; t++){
                if (flat_roll[pitch * MODEL_TIMESTEPS + t] == 1 && !note_on) {
                    note_on = true;
                    let onset = t;
                    let duration = 0;
                    for(let t2 = t; t2 < MODEL_TIMESTEPS; t2++){
                        if (flat_roll[pitch * MODEL_TIMESTEPS + t2] == 1) {
                            duration += 1;
                        }
                        else{
                            break;
                        }
                    }
                    note_sequence.push({ pitch: pitch, onset: onset, duration: duration });
                }
            }
        }
        return note_sequence;
    }

    async regenerate(x_in, mask_in, n_steps, temperature, activityBias, mask_rate, mode = "all") {
    }

    async sample(superposition, temperature, nStepsToSample, randomOrder) {
        let samplingOrder = _.range(nStepsToSample);
        if (randomOrder) {
            samplingOrder = _.shuffle(samplingOrder);
        }
        // iterate over document and sample pitch, onset, duration up to nStepsToSample
        for (let i of samplingOrder) {
            // iterate over pitch, onset, duration
            for (let j = 0; j < 3; j++) {
                let attribute = ATTRIBUTES[j];
                let n_values = null;
                if( attribute == "pitch"){
                    n_values = CLM_N_PITCHES ;
                }
                else{
                    n_values = CLM_N_DURATIONS;
                }
                let logits = await this.forward(superposition);
                let logits_flat = logits[ATTRIBUTES[j]].slice(i * (n_values+ 1), (i + 1) * (n_values+ 1));
                let probs = softmax(logits_flat, temperature);
                let sample = sample_categorical(probs);
                superposition[ATTRIBUTES[j]].fill(0, i * (n_values+ 1), (i + 1) * (n_values+ 1));
                superposition[ATTRIBUTES[j]][i * (n_values+ 1) + sample] = 1;
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

    combine_superpositions(a,b){
        // for each attribute, multiply the two superpositions
        for (let attribute of ATTRIBUTES){
            a[attribute] = a[attribute].map((x, i) => x * b[attribute][i]);
        }
        return a;
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
            let onset = note.onset / 2;
            let duration = note.duration / 2;
            console.log(pitch, onset, duration);
            flat_roll.fill(1, pitch * MODEL_TIMESTEPS + onset, pitch * MODEL_TIMESTEPS + onset + duration);
        }
        return flat_roll;
    }

    async generate_wo_infilling(x_in, mask_in, n_steps, temperature, activityBias) {
        let superposition = {
            pitch: new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_PITCHES + 1)).fill(1),
            onset: new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1)).fill(1),
            duration: new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_N_DURATIONS + 1)).fill(1),
        }

        let n_notes = 32;

        superposition = this.prepare_superposition(PENTATONIC_SCALE, _.range(0, CLM_N_DURATIONS, 2), _.range(2, CLM_N_DURATIONS, 2), n_notes);
        superposition = await this.sample(superposition, temperature, n_notes,true);

        // convert to note sequence
        let note_sequence = this.superposition_to_note_sequence(superposition);
        let flat_roll = this.note_sequence_to_flat_roll(note_sequence);
        return flat_roll;
    }
    
    async generate(x_in, mask_in, n_steps, temperature, activityBias) {

        // subtract mask from x_in
        x_in = x_in.map((x, i) => x - mask_in[i]);

        let scaleX = fullToScale(x_in, SCALE, MODEL_PITCHES, MODEL_TIMESTEPS);
        let scaleMask = fullToScale(mask_in, SCALE, MODEL_PITCHES, MODEL_TIMESTEPS);

        let maskIm = _.chunk(scaleMask, MODEL_TIMESTEPS);
        let xIm = _.chunk(scaleX, MODEL_TIMESTEPS );

        let nScalePitches = maskIm.length;

        // convert mask to nested array with MODEL_PITCHES, MODEL_TIMESTEPS
     
        let maskRectangles = findRectangles(maskIm);
        // test that maskRectangles is correct
        let maskIm2 = rectanglesToImage(maskRectangles, MODEL_TIMESTEPS, nScalePitches);
        // one liner to check that maskIm2 is equal to maskIm at every index by flattening both arrays
        assert(maskIm2.flat().every((v, i) => v === maskIm.flat()[i]));

        let existingNotes = this.flat_roll_to_note_sequence(x_in);
        let nRemainingNotes = CLM_DOCUMENT_LENGTH - existingNotes.length;

        // maps scale degrees to chromatic index
        let fullScale = []
        let note = 0;
        while(note < MODEL_PITCHES) {
            if (SCALE.includes(note % 12)) {
                fullScale.push(note);
            }
            note++;
        }
        let totalRectangleArea = maskRectangles.reduce((acc, rectangle) => acc + rectangle.area, 0);
        // normalize rectangle areas
        maskRectangles = maskRectangles.map(rectangle => {
            rectangle.notesAllocated = Math.floor(rectangle.area * nRemainingNotes / totalRectangleArea);
            return rectangle;
        });

        maskRectangles = maskRectangles.map(rectangle => ({...rectangle, startPitch: fullScale[rectangle.startRow], endPitch: fullScale[rectangle.endRow], startTimestep: rectangle.startCol, endTimestep: rectangle.endCol}));

        let n_notes = 32;

        // generate superpositions for each rectangle
        let rectangleSuperpositions = [];
        let priorSuperposition = this.prepare_superposition(PENTATONIC_SCALE, _.range(0, CLM_N_DURATIONS, 2), _.range(2, CLM_N_DURATIONS, 2), CLM_DOCUMENT_LENGTH);
        for (let i = 0; i < maskRectangles.length; i++) {
            let rectangle = maskRectangles[i];
            let rectangleSuperposition = this.prepare_superposition(_.range(rectangle.startPitch, rectangle.endPitch + 1), _.range(rectangle.startTimestep*2, (rectangle.endTimestep + 1)),"*", CLM_DOCUMENT_LENGTH);
            rectangleSuperposition = this.combine_superpositions(rectangleSuperposition, priorSuperposition);
            // trim to notesAllocated length
            rectangleSuperposition = {
                pitch: rectangleSuperposition.pitch.slice(0, rectangle.notesAllocated * (CLM_N_PITCHES + 1)),
                onset: rectangleSuperposition.onset.slice(0, rectangle.notesAllocated * (CLM_N_DURATIONS + 1)),
                duration: rectangleSuperposition.duration.slice(0, rectangle.notesAllocated * (CLM_N_DURATIONS + 1)),
            }
        }
        // concatenate superpositions
        let maskSuperposition = {
            pitch: rectangleSuperpositions.map(superposition => superposition.pitch).flat(),
            onset: rectangleSuperpositions.map(superposition => superposition.onset).flat(),
            duration: rectangleSuperpositions.map(superposition => superposition.duration).flat(),
        }

        let existingNotesSuperposition = this.note_sequence_to_superposition(existingNotes);

        // concatenate maskSuperposition and existingNotesSuperposition
        let combinedSuperposition = {
            pitch: [...maskSuperposition.pitch, ...existingNotesSuperposition.pitch],
            onset: [...maskSuperposition.onset, ...existingNotesSuperposition.onset],
            duration: [...maskSuperposition.duration, ...existingNotesSuperposition.duration],
        }

        let superposition = await this.sample(combinedSuperposition, temperature, n_notes,false);

        // convert to note sequence
        let note_sequence = this.superposition_to_note_sequence(superposition);

        // combine with existing notes
        note_sequence = [...existingNotes, ...note_sequence];

        let flat_roll = this.note_sequence_to_flat_roll(note_sequence);
        console.log(note_sequence);
        return flat_roll;
    }
}

export default CLModel;