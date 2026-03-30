import { h, render } from 'https://esm.sh/preact';
import htm from 'https://esm.sh/htm';

// Инициализация htm с помощью Preact
const html = htm.bind(h);

function App(props) {
    alert('sdfs')
  return html`<h1>Привет, ${props.name}!</h1>`;
}

render(html`<${App} name="мир" />`, document.body);
