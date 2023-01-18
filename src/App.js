import Roll from './Roll.js';
import React from 'react';
import * as ort from 'onnxruntime-web';
import Model from './Model.js';
import { Bars } from "react-loader-spinner"

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

  // centered welcome message and start button
  const Welcome = () => {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <div><h1>Welcome to Loop Savant!</h1></div>
        <img src="logo.jpg" style={{ width: "auto", height: 300 }}></img>
        <div style={{ marginTop: 32 }}>
          {model ?

            <button style={{
              fontSize: 21, padding: 16, borderRadius: 0, backgroundColor: "white", border: "2px solid teal"
              , animation: "glow 2s infinite"
            }}
              onClick={() => setIsOn(!isOn)}>{isOn ? "Stop" : "Neural network successfully loaded! Press here to start"}</button>
            : <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }} >

              < Bars color="teal" height={100} width={200} ></Bars>
              <h2>
                Neural network is loading... (34,6 MB total)
              </h2>

            </div>
          }
        </div>
        <span style={{ marginTop: 32 }}>contact : loopsavant at gmail dot com</span>
      </div >
    </div >
  }


  return (
    <div className="App" style={{ width: "100%" }}>
      {isOn ? <Roll model={model} />
        :
        Welcome()}
    </div>
  );
}

export default App
