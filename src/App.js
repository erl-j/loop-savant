import Roll from './roll.js';
import React from 'react';

function App() {

  const [isOn, setIsOn] = React.useState(false);
  return (
    <div className="App">
      <button onClick={() => setIsOn(!isOn)}>{isOn ? "Stop" : "Start"}</button>
      {isOn ? <Roll /> : null}
    </div>
  );
}

export default App;
