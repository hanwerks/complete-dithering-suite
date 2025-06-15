import React from 'react';
import PanelHeader from './PanelHeader';

const RightPanel: React.FC = () => {
  return (
    <div className="panel right-panel">
      <PanelHeader title="Parameters" />
      <div className="panel-content">
        <div className="section">
          <h3>Advanced Options</h3>
          <p>Advanced dithering options will go here</p>
        </div>
        <div className="section">
          <h3>Matrix Editor</h3>
          <p>Custom dithering matrix editing will go here</p>
        </div>
        <div className="section">
          <h3>Output Settings</h3>
          <p>Export and output configuration will go here</p>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;