import * as _ from 'lodash';
import * as ort from 'onnxruntime-web';
import { MODEL_PITCHES, MODEL_PARAMS, MODEL_TIMESTEPS } from './constants.js';
import { softmax } from './utils.js';

class CLModel {
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
        // let x_in = new Array(MODEL_PITCHES * MODEL_TIMESTEPS * 2).fill(0);
        // let mask_in = new Array(MODEL_PITCHES * MODEL_TIMESTEPS).fill(1);

        // let y, y_probs = await this.forward(x_in, mask_in);

        // x_in = new Array(MODEL_PITCHES * MODEL_TIMESTEPS * 2).fill(0);
        // x_in[0] = 1;

        // mask_in = new Array(MODEL_PITCHES * MODEL_TIMESTEPS).fill(1);
        // mask_in[0] = 0;

        // let y2, y_probs2 = await this.forward(x_in, mask_in);
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
    }

    async generate(x_in, mask_in, n_steps, temperature, activityBias) {

    }
}

export default CLModel;