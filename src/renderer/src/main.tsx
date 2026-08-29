import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ActionRing } from './components/ActionRing'
import './styles.css'

const isRing = window.location.hash === '#ring'
if (isRing) document.documentElement.classList.add('ring-document')
const Root = isRing ? ActionRing : App

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
