import React from 'react';
import * as ort from 'onnxruntime-web';

const N_PITCHES = 36;
const N_TIMESTEPS = 32;

function ModelTest() {

    React.useEffect(() => {

        let x = new Float32Array(N_PITCHES * N_TIMESTEPS * 2);
        let mask = new Float32Array(N_PITCHES * N_TIMESTEPS);

        console.log(`x: ${x}`);

        console.log("start");

        async function loadModel() {

            const session = await ort.InferenceSession.create('./model.onnx', { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });

            // generate model input
            const feeds = {
                x: new ort.Tensor("float32", x, [1, N_PITCHES, N_TIMESTEPS, 2]),
                mask: new ort.Tensor("float32", mask, [1, N_PITCHES, N_TIMESTEPS, 1]),
            };

            // execute the model
            // take time
            const start = new Date().getTime();
            let results = await session.run(feeds);
            const end = new Date().getTime();
            console.log(`time: ${end - start} ms`);

            console.log(results);
        };


        loadModel();

    }, [])


    return (
        <div>
        </div>
    );
}

export default ModelTest;
