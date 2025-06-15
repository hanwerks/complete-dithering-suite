import React from 'react';

interface PanelHeaderProps {
  title: string;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({ title }) => {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
    </div>
  );
};

export default PanelHeader;