import React from 'react';
import LeftPanel from './components/LeftPanel';
import CenterPanel from './components/CenterPanel';
import RightPanel from './components/RightPanel';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <div className="panel-container">
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>
    </div>
  );
};

export default App;