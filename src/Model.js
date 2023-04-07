import * as _ from 'lodash';
import * as ort from 'onnxruntime-web';
import { MODEL_PITCHES, MODEL_PARAMS, MODEL_TIMESTEPS } from './constants.js';
import { softmax } from './utils.js';

class Model {
    constructor(model_params) {
        this.model_path = model_params.path
        this.defaults = model_params.defaults;
    }

    async initialize() {
        ort.env.wasm.proxy = true;
        this.session = await ort.InferenceSession.create(process.env.PUBLIC_URL + "/" + this.model_path,
            { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }
        );
        // this.test_run();
    };

    async test_run() {
        let x_in = new Array(MODEL_PITCHES * MODEL_TIMESTEPS * 2).fill(0);
        let mask_in = new Array(MODEL_PITCHES * MODEL_TIMESTEPS).fill(1);

        let y, y_probs = await this.forward(x_in, mask_in);

        x_in = new Array(MODEL_PITCHES * MODEL_TIMESTEPS * 2).fill(0);
        x_in[0] = 1;

        mask_in = new Array(MODEL_PITCHES * MODEL_TIMESTEPS).fill(1);
        mask_in[0] = 0;

        let y2, y_probs2 = await this.forward(x_in, mask_in);

    }

    async forward(x_in, mask_in) {
        // check sizes of x_in and mask_in
        let x = new Float32Array(x_in);
        let mask = new Float32Array(mask_in);
        // generate model input
        const feeds = {
            x: new ort.Tensor("float32", x, [1, MODEL_PITCHES, MODEL_TIMESTEPS, 2]),
            mask: new ort.Tensor("float32", mask, [1, MODEL_PITCHES, MODEL_TIMESTEPS, 1]),
        };
        const start = new Date().getTime();
        let results = await this.session.run(feeds);
        const end = new Date().getTime();
        console.log(`time: ${end - start} ms`);
        return [results.y.data, results.y_probs.data];
    }


    // 
    async regenerate(x_in, mask_in, n_steps, temperature, activityBias, mask_rate, mode = "all") {

        //for sparse mode, masking a random of active cells and then removing the most likely to be inactive works well.
        // however, a similar approach is not good for denser mode as it leads to weird chords.


        console.assert(mode == "all" || mode == "sparser" || mode == "denser", "mode must be one of 'all', 'sparser', 'denser'");

        let n_active_start = x_in.reduce((a, b) => a + b, 0);

        let x_ch = x_in.map((x) => [x, 1 - x]).flat();

        let mask_ch = mask_in;

        let n_masked = mask_ch.reduce((a, b) => a + b, 0);

        for (let t = 0; t < n_steps; t++) {


            let x_ch_2d = _.chunk(x_ch, 2)


            if (mode == "all") {
                mask_ch = new Array(MODEL_PITCHES * MODEL_TIMESTEPS).fill(0).map((x, i) => (mask_ch[i] == 1) ? 1 : 0);
            }
            if (mode == "sparser") {
                mask_ch = new Array(MODEL_PITCHES * MODEL_TIMESTEPS).fill(0).map((x, i) => (mask_ch[i] == 1 && x_ch_2d[i][0] == 1) ? 1 : 0);
            }
            if (mode == "denser") {
                mask_ch = new Array(MODEL_PITCHES * MODEL_TIMESTEPS).fill(0).map((x, i) => (mask_ch[i] == 1 && x_ch_2d[i][1] == 1) ? 1 : 0);
            }

            let in_masked_indices = []
            for (let i = 0; i < mask_ch.length; i++) {
                if (mask_ch[i] == 1) {
                    in_masked_indices.push(i);
                }
            }

            in_masked_indices = _.shuffle(in_masked_indices);

            in_masked_indices = in_masked_indices.slice(0, Math.max(Math.floor(in_masked_indices.length * mask_rate), 1));


            mask_ch = new Array(MODEL_PITCHES * MODEL_TIMESTEPS).fill(0);
            for (let i = 0; i < in_masked_indices.length; i++) {
                mask_ch[in_masked_indices[i]] = 1;
            }


            let y, y_probs;
            [y, y_probs] = await this.forward(x_ch, mask_ch);


            // show datatype of acitivityBias

            y = _.chunk(y, 2).map(x => [x[0] + activityBias, x[1]]).flat();
            y_probs = _.chunk(y, 2).map(x => softmax(x, temperature)).flat();

            // assert that y_probs approximately sums to 1
            // let y_probs_sums = _.chunk(y_probs, 2).map((x) => x[0] + x[1]);
            // for (let i = 0; i < y_probs_sums.length; i++) {
            //     console.assert(Math.abs(y_probs_sums[i] - 1) < 1e-5, `y_probs_sums[${i}] = ${y_probs_sums[i]}`);
            // }

            n_masked = Math.floor(this.schedule((t + 1) / n_steps) * MODEL_PITCHES * MODEL_TIMESTEPS);

            let sample_2d = _.chunk(y_probs, 2).map((x) => {
                let r = Math.random();
                let on = x[0] > r
                return [on, 1 - on];
            }
            )
            // let sample_2d_sums = sample_2d.map((x) => x[0] + x[1]);
            // for (let i = 0; i < sample_2d_sums.length; i++) {
            //     console.assert(sample_2d_sums[i] == 1, `sample_2d_sums[${i}] = ${sample_2d_sums[i]}`);
            // }

            // get indices of masked notes
            let masked_indices = [];
            for (let i = 0; i < mask_ch.length; i++) {
                if (mask_ch[i] == 1) {
                    masked_indices.push(i);
                }
            }
            let unmask_indices = [];
            if (mode == "all") {
                // shuffle indices
                masked_indices = _.shuffle(masked_indices);

                // indices to unmask
                unmask_indices = masked_indices
            }
            if (mode == "sparser") {

                let n_unmask = Math.max(Math.floor(masked_indices.length * 0.5), 1);

                // get probs of masked notes being on
                let masked_probs = masked_indices.map((i) => ({ index: i, prob: y_probs[2 * i] }));

                // sort by probs
                masked_probs.sort((a, b) => a.prob - b.prob);


                // indices to unmask
                unmask_indices = masked_probs.slice(0, n_unmask).map((x) => x.index);
            }
            if (mode == "denser") {
                // let n_unmask = Math.max(Math.floor(masked_indices.length * 0.05), 1);
                // get probs of masked notes being on
                let masked_probs = masked_indices.map((i) => ({ index: i, prob: y_probs[2 * i + 1] }));

                // sort by probs
                masked_probs.sort((a, b) => a.prob - b.prob);


                // reverse order
                masked_probs.reverse();


                // indices to unmask
                //unmask_indices = masked_probs.slice(0, n_unmask).map((x) => x.index);
                unmask_indices = masked_indices
            }

            let x_2d = _.chunk(x_ch, 2);

            for (let i = 0; i < unmask_indices.length; i++) {
                if (mode == "all") {
                    x_2d[unmask_indices[i]] = sample_2d[unmask_indices[i]];
                }
                if (mode == "sparser") {
                    x_2d[unmask_indices[i]] = [0, 1];
                }
                if (mode == "denser") {
                    x_2d[unmask_indices[i]] = sample_2d[unmask_indices[i]];
                }
                mask_ch[unmask_indices[i]] = 0;
            }
            x_ch = x_2d.flat();
        }

        let x_out = _.chunk(x_ch, 2).map((x) => x[0]).flat();

        let n_active_end = x_out.reduce((a, b) => a + b, 0);

        console.log(`n_active_start = ${n_active_start}`);

        console.log(`n_active_end = ${n_active_end}`);

        return x_out;
    }

    async generate(x_in, mask_in, n_steps, temperature, activityBias) {

        let x_ch = x_in.map((x) => [x, 1 - x]).flat();
        let mask_ch = mask_in;

        let n_masked = mask_ch.reduce((a, b) => a + b, 0);
        let mask_ratio = n_masked / (MODEL_PITCHES * MODEL_TIMESTEPS);

        let start_step = Math.floor(this.inverse_schedule(mask_ratio) * n_steps);

        for (let t = start_step; t < n_steps; t++) {

            let y, y_probs;
            [y, y_probs] = await this.forward(x_ch, mask_ch);

            // show datatype of acitivityBias
            y = _.chunk(y, 2).map(x => [x[0] + activityBias, x[1]]).flat();
            y_probs = _.chunk(y, 2).map(x => softmax(x, temperature)).flat();

            // assert that y_probs approximately sums to 1
            // let y_probs_sums = _.chunk(y_probs, 2).map((x) => x[0] + x[1]);
            // for (let i = 0; i < y_probs_sums.length; i++) {
            //     console.assert(Math.abs(y_probs_sums[i] - 1) < 1e-5, `y_probs_sums[${i}] = ${y_probs_sums[i]}`);
            // }

            n_masked = Math.floor(this.schedule((t + 1) / n_steps) * MODEL_PITCHES * MODEL_TIMESTEPS);

            let sample_2d = _.chunk(y_probs, 2).map((x) => {
                let r = Math.random();
                let on = x[0] > r
                return [on, 1 - on];
            }
            )
            // let sample_2d_sums = sample_2d.map((x) => x[0] + x[1]);
            // for (let i = 0; i < sample_2d_sums.length; i++) {
            //     console.assert(sample_2d_sums[i] == 1, `sample_2d_sums[${i}] = ${sample_2d_sums[i]}`);
            // }

            // get indices of masked notes
            let masked_indices = [];
            for (let i = 0; i < mask_ch.length; i++) {
                if (mask_ch[i] == 1) {
                    masked_indices.push(i);
                }
            }
            // shuffle indices
            masked_indices = _.shuffle(masked_indices);

            // count number of masked notes
            let n_masked_current = mask_ch.reduce((a, b) => a + b, 0);

            // number to unmask
            let n_unmask = n_masked_current - n_masked;

            // indices to unmask
            let unmask_indices = masked_indices.slice(0, n_unmask);

            let x_2d = _.chunk(x_ch, 2);

            for (let i = 0; i < unmask_indices.length; i++) {
                x_2d[unmask_indices[i]] = sample_2d[unmask_indices[i]];
                mask_ch[unmask_indices[i]] = 0;
            }
            x_ch = x_2d.flat();
        }

        let x_out = _.chunk(x_ch, 2).map((x) => x[0]).flat();

        return x_out;
    }

    schedule(ratio) {
        return Math.cos(ratio * Math.PI / 2);
    }

    inverse_schedule(ratio) {
        return Math.acos(ratio) * 2 / Math.PI;
    }
}

export default Model;