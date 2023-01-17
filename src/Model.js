import React from 'react';
import * as ort from 'onnxruntime-web';
import * as _ from 'lodash';
import WebMidi from "webmidi";

// let MODEL_PATH =
//   !process.env.NODE_ENV || process.env.NODE_ENV === "development"
//     ? process.env.PUBLIC_URL + "/models/distilbert-base-uncased-masked-lm.onnx"
//     : "https://cdn-lfs.huggingface.co/repos/73/2e/732ee04e620bc04681d74f44f13032805c14dff4c56cdaeca28120d3e0ed7aa6/14522ffbc84d27b8cc558f6093f4f4f41fa29fc89c54a717f542cf0c43c62eee?response-content-disposition=attachment%3B%20filename%3D%22distilbert-base-uncased-masked-lm.onnx%22";

const N_PITCHES = 36;
const N_TIMESTEPS = 32;


const softmax = (x, temperature) => {
    x = x.map((a) => a / temperature);
    let e_x = x.map((a) => Math.exp(a));
    let sum = e_x.reduce((a, b) => a + b);
    return e_x.map((a) => a / sum);
};

class Model {
    constructor() {
    }

    async initialize() {
        ort.env.wasm.proxy = true;
        this.session = await ort.InferenceSession.create('./tiny.onnx',
            { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }
        );
        // this.test_run();
    };

    async test_run() {
        let x_in = new Array(N_PITCHES * N_TIMESTEPS * 2).fill(0);
        let mask_in = new Array(N_PITCHES * N_TIMESTEPS).fill(1);

        let y, y_probs = await this.forward(x_in, mask_in);
        console.log(y_probs);

        x_in = new Array(N_PITCHES * N_TIMESTEPS * 2).fill(0);
        x_in[0] = 1;

        mask_in = new Array(N_PITCHES * N_TIMESTEPS).fill(1);
        mask_in[0] = 0;

        let y2, y_probs2 = await this.forward(x_in, mask_in);

        console.log(y_probs2);
    }

    async forward(x_in, mask_in) {
        // check sizes of x_in and mask_in
        let x = new Float32Array(x_in);
        let mask = new Float32Array(mask_in);
        // generate model input
        const feeds = {
            x: new ort.Tensor("float32", x, [1, N_PITCHES, N_TIMESTEPS, 2]),
            mask: new ort.Tensor("float32", mask, [1, N_PITCHES, N_TIMESTEPS, 1]),
        };
        const start = new Date().getTime();
        let results = await this.session.run(feeds);
        const end = new Date().getTime();
        console.log(`time: ${end - start} ms`);
        console.log(results);
        return [results.y.data, results.y_probs.data];
    }



    async regenerate(x_in, mask_in, n_steps, temperature, activityBias, mask_rate) {

        let x_ch = x_in.map((x) => [x, 1 - x]).flat();
        let mask_ch = mask_in;

        let n_masked = mask_ch.reduce((a, b) => a + b, 0);


        for (let t = 0; t < n_steps; t++) {

            mask_ch = new Array(N_PITCHES * N_TIMESTEPS).fill(0).map((x, i) => (Math.random() < mask_rate && mask_in[i] == 1) ? 1 : 0);

            let y, y_probs;
            [y, y_probs] = await this.forward(x_ch, mask_ch);

            console.log(y[0] + activityBias);

            // show datatype of acitivityBias
            console.log(typeof activityBias);

            y = _.chunk(y, 2).map(x => [x[0] + activityBias, x[1]]).flat();
            console.log(y);
            y_probs = _.chunk(y, 2).map(x => softmax(x, temperature)).flat();

            // assert that y_probs approximately sums to 1
            // let y_probs_sums = _.chunk(y_probs, 2).map((x) => x[0] + x[1]);
            // for (let i = 0; i < y_probs_sums.length; i++) {
            //     console.assert(Math.abs(y_probs_sums[i] - 1) < 1e-5, `y_probs_sums[${i}] = ${y_probs_sums[i]}`);
            // }

            n_masked = Math.floor(this.schedule((t + 1) / n_steps) * N_PITCHES * N_TIMESTEPS);

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


            // indices to unmask
            let unmask_indices = masked_indices

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

    async generate(x_in, mask_in, n_steps, temperature, activityBias) {

        let x_ch = x_in.map((x) => [x, 1 - x]).flat();
        let mask_ch = mask_in;

        let n_masked = mask_ch.reduce((a, b) => a + b, 0);
        let mask_ratio = n_masked / (N_PITCHES * N_TIMESTEPS);

        let start_step = Math.floor(this.inverse_schedule(mask_ratio) * n_steps);

        for (let t = start_step; t < n_steps; t++) {

            let y, y_probs;
            [y, y_probs] = await this.forward(x_ch, mask_ch);

            console.log(y[0] + activityBias);

            // show datatype of acitivityBias
            console.log(typeof activityBias);

            y = _.chunk(y, 2).map(x => [x[0] + activityBias, x[1]]).flat();
            console.log(y);
            y_probs = _.chunk(y, 2).map(x => softmax(x, temperature)).flat();

            // assert that y_probs approximately sums to 1
            // let y_probs_sums = _.chunk(y_probs, 2).map((x) => x[0] + x[1]);
            // for (let i = 0; i < y_probs_sums.length; i++) {
            //     console.assert(Math.abs(y_probs_sums[i] - 1) < 1e-5, `y_probs_sums[${i}] = ${y_probs_sums[i]}`);
            // }

            n_masked = Math.floor(this.schedule((t + 1) / n_steps) * N_PITCHES * N_TIMESTEPS);

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