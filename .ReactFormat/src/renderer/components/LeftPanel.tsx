import React from 'react';
import PanelHeader from './PanelHeader';

const LeftPanel: React.FC = () => {
  return (
    <div className="panel left-panel">
      <PanelHeader title="Parameters" />
      <div className="panel-content">
        <div className="section">
          <h3>Algorithm Settings</h3>
          <p>Dithering algorithm controls will go here</p>
        </div>
        <div className="section">
          <h3>Noise Controls</h3>
          <p>Noise and randomization settings will go here</p>
        </div>
        <div className="section">
          <h3>Color Palette</h3>
          <p>Color palette selection and editing will go here</p>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;