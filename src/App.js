import Roll from './Roll.js';
import React from 'react';
import * as ort from 'onnxruntime-web';
import Model from './Model.js';

const N_PITCHES = 36;
const N_TIMESTEPS = 32;

function App() {

  const [model, setModel] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      let model = new Model();
      await model.initialize();
      setModel(model);
    })();
  }, []);

  const [isOn, setIsOn] = React.useState(false);
  return (
    <div className="App" style={{ width: "100%" }}>
      {/* <ModelTest /> */}
      {model && (isOn ? <Roll model={model} /> : <button onClick={() => setIsOn(!isOn)}>{isOn ? "Stop" : "Start"}</button>)}
    </div>
  );
}

export default App
