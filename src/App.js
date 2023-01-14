import Roll from './roll.js';
import React from 'react';
import ModelTest from './ModelTest.js';

function App() {

  const [isOn, setIsOn] = React.useState(false);
  return (
    <div className="App">
      <ModelTest />
      <button onClick={() => setIsOn(!isOn)}>{isOn ? "Stop" : "Start"}</button>
      {/* {isOn ? <Roll /> : null} */}
    </div>
  );
}

export default App;
