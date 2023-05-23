import logo from './logo.svg';
import './App.css';
import React from 'react';
import {Button, Progress} from 'semantic-ui-react'

function App() {
  return (
      <div>
    <p> 안녕하세요~!</p>
    <Button primary> 눌러줘 </Button>
    <Progress precent = {66} indicating/>
    </div>
  );
}

export default App;
