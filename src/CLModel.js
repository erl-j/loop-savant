import * as _ from 'lodash';
import * as ort from 'onnxruntime-web';
import { MODEL_PITCHES, MODEL_PARAMS, MODEL_TIMESTEPS, SCALE } from './constants.js';
import { softmax, sample_categorical, fullToScale } from './utils.js';
import { findRectangles, rectanglesToImage } from './findRectangles.js';
import { assert } from 'tone/build/esm/core/util/Debug.js';

const CLM_DOCUMENT_LENGTH = 128;
const CLM_N_DURATIONS = 64;
const CLM_N_PITCHES = 36;
const CLM_PITCH_VOCAB_SIZE = CLM_N_PITCHES+1;
const CLM_DURATION_VOCAB_SIZE = CLM_N_DURATIONS+1;

const ATTRIBUTES = ["pitch", "onset", "duration"];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26, 28, 29, 31, 33, 35];
const PENTATONIC_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33];

class CLModel {
    constructor(model_params) {
        this.model_path = model_params.path
        this.defaults = model_params.defaults;

        // maps scale degrees to chromatic index
        this.fullScale = []
        let note = 0;
        while(note < MODEL_PITCHES) {
            if (SCALE.includes(note % 12)) {
                this.fullScale.push(note);
            }
            note++;
        }
    }

    async initialize() {
        ort.env.wasm.proxy = true;
        this.session = await ort.InferenceSession.create(process.env.PUBLIC_URL + "/" + this.model_path,
            { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }
            // { executionProviders: ['webgl'], enableProfiling: true }
        );
        this.testRun(10);
    };

    async forward(superposition) {
        // generate model input
        const feeds = {
            pitch: new ort.Tensor("float32", superposition["pitch"], [1, CLM_DOCUMENT_LENGTH, CLM_PITCH_VOCAB_SIZE]),
            onset: new ort.Tensor("float32", superposition["onset"], [1, CLM_DOCUMENT_LENGTH, CLM_DURATION_VOCAB_SIZE]),
            duration: new ort.Tensor("float32", superposition["duration"], [1, CLM_DOCUMENT_LENGTH, CLM_DURATION_VOCAB_SIZE]),
        };
        let results = await this.session.run(feeds);
        return { pitch: results.pitch_logits.data, onset: results.onset_logits.data, duration: results.duration_logits.data };
    }

    async testRun(n_iterations = 1) {
        // test forward pass

        let execution_times = [];
        for (let i = 0; i < n_iterations; i++) {
            let pitch = new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_PITCH_VOCAB_SIZE)).fill(1);
            let onset = new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_DURATION_VOCAB_SIZE)).fill(1);
            let duration = new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_DURATION_VOCAB_SIZE)).fill(1);
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
    flatRollToNoteSequence(flatRoll) {
        // flatRoll: timesteps * pitches
        // returns: [{ pitch: 0, onset: 0, duration: 0 }, ...]
        let noteSequence = [];
    
        // iterate over flatRoll, track note onsets and offsets, 
        // compute onset, pitch and duration and add to noteSequence
        for (let pitch = 0; pitch < MODEL_PITCHES; pitch++) {
            let note_on = false;
            for(let t = 0; t < MODEL_TIMESTEPS; t++){
                if (flatRoll[pitch * MODEL_TIMESTEPS + t] == 1 && !note_on) {
                    note_on = true;
                    let onset = t;
                    let duration = 0;
                    for(let t2 = t; t2 < MODEL_TIMESTEPS; t2++){
                        if (flatRoll[pitch * MODEL_TIMESTEPS + t2] == 1) {
                            duration += 1;
                        }
                        else{
                            break;
                        }
                    }
                    noteSequence.push({ pitch: pitch, onset: onset* 2 , duration: duration * 2 });
                }
            }
        }
        return noteSequence;
    }

    async regenerate(xIn, maskIn, nSteps, temperature, activityBias, mask_rate, mode = "all") {
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
            pitch: superposition.pitch.slice(0, nStepsToSample * (CLM_PITCH_VOCAB_SIZE)),
            onset: superposition.onset.slice(0, nStepsToSample * (CLM_DURATION_VOCAB_SIZE)),
            duration: superposition.duration.slice(0, nStepsToSample * (CLM_DURATION_VOCAB_SIZE))
        }
    }

    prepareSuperposition(pitches_allowed = "*", onsets_allowed = "*", durations_allowed = "*", n_active_notes = ">0") {

        if (pitches_allowed == "*") {
            pitches_allowed = [..._.range(CLM_N_PITCHES),-1];
        }
        if (onsets_allowed == "*") {
            onsets_allowed = [..._.range(CLM_N_DURATIONS),-1]
        }
        if (durations_allowed == "*") {
            durations_allowed = [..._.range(CLM_N_DURATIONS),-1];
        }
        let step_pitches = Array((CLM_PITCH_VOCAB_SIZE)).fill(0);
        for (let i = 0; i < pitches_allowed.length; i++) {
            step_pitches[pitches_allowed[i] + 1] = 1;
        }
        let step_onsets = Array((CLM_DURATION_VOCAB_SIZE)).fill(0);
        for (let i = 0; i < onsets_allowed.length; i++) {
            step_onsets[onsets_allowed[i] + 1] = 1;
        }
        let step_durations = Array((CLM_DURATION_VOCAB_SIZE)).fill(0);
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
                    pitches[i * (CLM_PITCH_VOCAB_SIZE)] = 0;
                    onsets[i * (CLM_DURATION_VOCAB_SIZE)] = 0;
                    durations[i * (CLM_DURATION_VOCAB_SIZE)] = 0;
                } else {
                    if (i > n_active_notes) {
                        pitches.fill(0, i * (CLM_PITCH_VOCAB_SIZE), (i + 1) * (CLM_PITCH_VOCAB_SIZE));
                        pitches[i * (CLM_PITCH_VOCAB_SIZE)] = 1;
                        onsets.fill(0, i * (CLM_DURATION_VOCAB_SIZE), (i + 1) * (CLM_DURATION_VOCAB_SIZE));
                        onsets[i * (CLM_DURATION_VOCAB_SIZE)] = 1;
                        durations.fill(0, i * (CLM_DURATION_VOCAB_SIZE), (i + 1) * (CLM_DURATION_VOCAB_SIZE));
                        durations[i * (CLM_DURATION_VOCAB_SIZE)] = 1;
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

    combineSuperpositions(a,b){
        // for each attribute, multiply the two superpositions
        for (let attribute of ATTRIBUTES){
            a[attribute] = a[attribute].map((x, i) => x * b[attribute][i]);
        }
        return a;
    }

    noteToSuperposition(note) {
        console.log(note)
        let superposition = {
            pitch: Array((CLM_PITCH_VOCAB_SIZE)).fill(0),
            onset: Array((CLM_DURATION_VOCAB_SIZE)).fill(0),
            duration: Array((CLM_DURATION_VOCAB_SIZE)).fill(0)
        }
        superposition.pitch[note.pitch + 1] = 1;
        superposition.onset[note.onset + 1] = 1;
        superposition.duration[note.duration + 1] = 1;
        return superposition;
    }

    noteSequenceToSuperposition(notes_sequence) {
        let superposition = this.noteToSuperposition(notes_sequence[0]);
        for (let i = 1; i < notes_sequence.length; i++) {
            superposition = { pitch: superposition.pitch.concat(this.noteToSuperposition(notes_sequence[i]).pitch),
                                onset: superposition.onset.concat(this.noteToSuperposition(notes_sequence[i]).onset),
                                duration: superposition.duration.concat(this.noteToSuperposition(notes_sequence[i]).duration)
                            }
        }
        return superposition;
    }

    superpositionToNoteSequence(superposition) {
        let noteSequence = [];
        let n_notes = superposition["pitch"].length / (CLM_PITCH_VOCAB_SIZE)
        for (let i = 0; i < n_notes; i++) {
            let pitch = _.indexOf(superposition.pitch.slice(i * (CLM_PITCH_VOCAB_SIZE), (i + 1) * (CLM_PITCH_VOCAB_SIZE)), 1) - 1;
            let onset = _.indexOf(superposition.onset.slice(i * (CLM_DURATION_VOCAB_SIZE), (i + 1) * (CLM_DURATION_VOCAB_SIZE)), 1) - 1;
            let duration = _.indexOf(superposition.duration.slice(i * (CLM_DURATION_VOCAB_SIZE), (i + 1) * (CLM_DURATION_VOCAB_SIZE)), 1) - 1;
            if (pitch != -1 && onset != -1 && duration != -1) {
                let note = {
                    pitch: pitch,
                    onset: onset,
                    duration: duration
                }
                noteSequence.push(note);
            }
        }
        return noteSequence;
    }

    noteSequenceToFlatRoll(noteSequence) {
        let flatRoll = Array(MODEL_PITCHES * MODEL_TIMESTEPS).fill(0);
        for (let i = 0; i < noteSequence.length; i++) {
            let note = noteSequence[i];
            let pitch = note.pitch;
            let onset = note.onset / 2;
            let duration = note.duration / 2;
            flatRoll.fill(1, pitch * MODEL_TIMESTEPS + onset, pitch * MODEL_TIMESTEPS + onset + duration);
        }
        return flatRoll;
    }

    async generateWoInfilling(xIn, maskIn, nSteps, temperature, activityBias) {
        let superposition = {
            pitch: new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_PITCH_VOCAB_SIZE)).fill(1),
            onset: new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_DURATION_VOCAB_SIZE)).fill(1),
            duration: new Float32Array(1 * CLM_DOCUMENT_LENGTH * (CLM_DURATION_VOCAB_SIZE)).fill(1),
        }

        let n_notes = 32;

        superposition = this.prepareSuperposition(PENTATONIC_SCALE, _.range(0, CLM_N_DURATIONS, 2), _.range(2, CLM_N_DURATIONS, 2), n_notes);
        superposition = await this.sample(superposition, temperature, n_notes,true);

        // convert to note sequence
        let noteSequence = this.superpositionToNoteSequence(superposition);
        let flatRoll = this.noteSequenceToFlatRoll(noteSequence);
        return flatRoll;
    }
    
    async generate(xIn, maskIn,_0,temperature,_1) {
        // remove masked activity
        let xRest = xIn.map((x, i) => x - maskIn[i]);

        // convert to full domain
        let scaleX = fullToScale(xRest, SCALE, MODEL_PITCHES, MODEL_TIMESTEPS);
        let scaleMask = fullToScale(maskIn, SCALE, MODEL_PITCHES, MODEL_TIMESTEPS);

        let maskIm = _.chunk(scaleMask, MODEL_TIMESTEPS);
        let nScalePitches = maskIm.length;

        // convert mask to nested array with MODEL_PITCHES, MODEL_TIMESTEPS
        let maskRectangles = findRectangles(maskIm);
        // test that maskRectangles is correct
        let maskIm2 = rectanglesToImage(maskRectangles, MODEL_TIMESTEPS, nScalePitches);
        // one liner to check that maskIm2 is equal to maskIm at every index by flattening both arrays
        assert(maskIm2.flat().every((v, i) => v === maskIm.flat()[i]));
        let existingNotes = this.flatRollToNoteSequence(xRest);
        let nRemainingNotes = CLM_DOCUMENT_LENGTH - existingNotes.length;

        let totalRectangleArea = maskRectangles.reduce((acc, rectangle) => acc + rectangle.area, 0);
        // normalize rectangle areas
        maskRectangles = maskRectangles.map(rectangle => (
            {...rectangle, notesAllocated : Math.floor(rectangle.area * nRemainingNotes / totalRectangleArea), 
            startPitch: this.fullScale[rectangle.startRow],
            endPitch: this.fullScale[rectangle.endRow],
            startTimestep: rectangle.startCol*2,
            endTimestep: rectangle.endCol*2}));


        let priorSuperposition = this.prepareSuperposition([...MAJOR_SCALE,-1], [..._.range(0, CLM_N_DURATIONS, 2),-1], [..._.range(0, CLM_N_DURATIONS, 2),-1],null);

        let rectangleSuperpositions = maskRectangles.map(rectangle => {
            let rectangleSuperposition = this.prepareSuperposition(
                [..._.range(rectangle.startPitch, rectangle.endPitch + 1), -1],
                [..._.range(rectangle.startTimestep, rectangle.endTimestep + 1), -1],
                [..._.range(2, 64, 2), -1],
                null
            );
            rectangleSuperposition = this.combineSuperpositions(rectangleSuperposition, priorSuperposition);
            return {
                pitch: rectangleSuperposition.pitch.slice(0, rectangle.notesAllocated * (CLM_PITCH_VOCAB_SIZE)),
                onset: rectangleSuperposition.onset.slice(0, rectangle.notesAllocated * (CLM_DURATION_VOCAB_SIZE)),
                duration: rectangleSuperposition.duration.slice(0, rectangle.notesAllocated * (CLM_DURATION_VOCAB_SIZE)),
            };
        });
        // concatenate superpositions
        let maskSuperposition = {
            pitch: rectangleSuperpositions.map(superposition => superposition.pitch).flat(),
            onset: rectangleSuperpositions.map(superposition => superposition.onset).flat(),
            duration: rectangleSuperpositions.map(superposition => superposition.duration).flat(),
        }

        let randPerm = _.shuffle(_.range(0, maskSuperposition.pitch.length / (CLM_PITCH_VOCAB_SIZE)));
        // shuffle maskSuperposition
        maskSuperposition = {
            pitch: randPerm.map(i => maskSuperposition.pitch.slice(i * CLM_PITCH_VOCAB_SIZE, (i + 1) * CLM_PITCH_VOCAB_SIZE)).flat(),
            onset: randPerm.map(i => maskSuperposition.onset.slice(i * CLM_DURATION_VOCAB_SIZE, (i + 1) * CLM_DURATION_VOCAB_SIZE)).flat(),
            duration: randPerm.map(i => maskSuperposition.duration.slice(i * CLM_DURATION_VOCAB_SIZE, (i + 1) * CLM_DURATION_VOCAB_SIZE)).flat(),
        }

        let MAX_NOTES_TO_ADD = 32;

        // crop maskSuperposition to MAX_NOTES_TO_ADD
        maskSuperposition = {
            pitch: maskSuperposition.pitch.slice(0, MAX_NOTES_TO_ADD * CLM_PITCH_VOCAB_SIZE),
            onset: maskSuperposition.onset.slice(0, MAX_NOTES_TO_ADD * CLM_DURATION_VOCAB_SIZE),
            duration: maskSuperposition.duration.slice(0, MAX_NOTES_TO_ADD * CLM_DURATION_VOCAB_SIZE),
        }

        // join with existing notes
        let combinedSuperposition;
        if (existingNotes.length > 0) {
            let existingNotesSuperposition = this.noteSequenceToSuperposition(existingNotes);
            // concatenate maskSuperposition and existingNotesSuperposition
            console.log({existingNotesSuperposition});
            console.log("post")
            console.log(this.superpositionToNoteSequence(existingNotesSuperposition));
            combinedSuperposition = {
                pitch: [...maskSuperposition.pitch, ...existingNotesSuperposition.pitch],
                onset: [...maskSuperposition.onset, ...existingNotesSuperposition.onset],
                duration: [...maskSuperposition.duration, ...existingNotesSuperposition.duration],
            }
        }
        else {
            combinedSuperposition = maskSuperposition;
        }

        console.log({existingNotes});

        // pad with -1
        let empty_superposition = this.prepareSuperposition([-1], [-1], [-1], null);

        // pad combinedSuperposition to CLM_DOCUMENT_LENGTH
        let nEmptyNotes = CLM_DOCUMENT_LENGTH - combinedSuperposition.pitch.length / CLM_PITCH_VOCAB_SIZE;
        // crop empty_superposition to nEmptyNotes
        empty_superposition = {
            pitch: empty_superposition.pitch.slice(0, nEmptyNotes * CLM_PITCH_VOCAB_SIZE),
            onset: empty_superposition.onset.slice(0, nEmptyNotes * CLM_DURATION_VOCAB_SIZE),
            duration: empty_superposition.duration.slice(0, nEmptyNotes * CLM_DURATION_VOCAB_SIZE),
        }
        combinedSuperposition = {
            pitch: [...combinedSuperposition.pitch, ...empty_superposition.pitch],
            onset: [...combinedSuperposition.onset, ...empty_superposition.onset],
            duration: [...combinedSuperposition.duration, ...empty_superposition.duration],
        }

        console.log("combinedSuperposition", {
            pitch: _.chunk(combinedSuperposition.pitch, CLM_PITCH_VOCAB_SIZE),
            onset: _.chunk(combinedSuperposition.onset, CLM_DURATION_VOCAB_SIZE),
            duration: _.chunk(combinedSuperposition.duration, CLM_DURATION_VOCAB_SIZE),
        }
        );

        let superposition = await this.sample(combinedSuperposition, temperature, MAX_NOTES_TO_ADD,false);

        // convert to note sequence
        let noteSequence = this.superpositionToNoteSequence(superposition);

        console.log("noteSequence", noteSequence);

        // combine with existing notes
        noteSequence = [...noteSequence, ...existingNotes];

        let flatRoll = this.noteSequenceToFlatRoll(noteSequence);
        return flatRoll;
    }
}

export default CLModel;