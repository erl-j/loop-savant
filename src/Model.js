import React from 'react';
import * as ort from 'onnxruntime-web';
import * as _ from 'lodash';


// let MODEL_PATH =
//   !process.env.NODE_ENV || process.env.NODE_ENV === "development"
//     ? process.env.PUBLIC_URL + "/models/distilbert-base-uncased-masked-lm.onnx"
//     : "https://cdn-lfs.huggingface.co/repos/73/2e/732ee04e620bc04681d74f44f13032805c14dff4c56cdaeca28120d3e0ed7aa6/14522ffbc84d27b8cc558f6093f4f4f41fa29fc89c54a717f542cf0c43c62eee?response-content-disposition=attachment%3B%20filename%3D%22distilbert-base-uncased-masked-lm.onnx%22";

const N_PITCHES = 36;
const N_TIMESTEPS = 32;

class Model {
    constructor() {
    }

    async initialize() {
        this.session = await ort.InferenceSession.create('./model.onnx',
            { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }
        );
        this.test_run();
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
        return results.y.data, results.y_probs.data;
    }

    async generate(x_in, mask_in, n_steps) {
        let x_ch = x_in.map((x) => [x, 1 - x]).flat();
        let mask_ch = mask_in;

        let n_masked = mask_ch.reduce((a, b) => a + b, 0);
        let mask_ratio = n_masked / (N_PITCHES * N_TIMESTEPS);

        let start_step = Math.floor(this.inverse_schedule(mask_ratio) * n_steps);

        console.log(`test: ${this.inverse_schedule(0)}`);
        console.log(`n_steps: ${n_steps}`);
        console.log(`mask_ratio: ${mask_ratio}`);
        console.log(`start_step: ${start_step}`);
        console.log(`n_masked: ${n_masked}`);

        for (let t = start_step; t < n_steps; t++) {

            console.log('x_ch length: ' + x_ch.length);
            console.log('mask_ch length: ' + mask_ch.length);
            console.log(`n_masked: ${n_masked}`);
            console.log(`t: ${t}`);

            let y, y_probs = await this.forward(x_ch, mask_ch);
            n_masked = Math.floor(this.schedule((t + 1) / n_steps) * N_PITCHES * N_TIMESTEPS);

            let sample = _.chunk(y_probs, 2).map((x) => {
                let r = Math.random();
                return [x[0] > r, x[1] > r];
            }
            ).flat();

            console.asssert(sample.length == mask_ch.length);

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

            let sample_2d = _.chunk(sample, 2);
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