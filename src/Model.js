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
        this.session = await ort.InferenceSession.create('./model.onnx', { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    };

    async forward(x_in, mask_in) {
        // check sizes of x_in and mask_in
        // assert
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
        return results.y_probs.data;
    }

    async generate(x_in, mask_in) {

        let x_ch = x_in.map((x) => [x, 1 - x]).flat();
        let mask_ch = mask_in;

        let y_probs = await this.forward(x_ch, mask_ch);

        console.log(y_probs);
        let on = _.chunk(y_probs, 2).map((x) => x[0] > 0.5);
        console.log(on);
        return on;
    }
}

export default Model;