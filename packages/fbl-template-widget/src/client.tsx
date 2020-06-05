// FBL Master Widget Class
import * as React from 'react';
import Accordian from 'react-bootstrap/Accordian';
import { 
  ReactWidget, 
 } from'@jupyterlab/apputils';

import '../style/index.css';

type IClientConfig = {
    [key: string]: {
        [key2: string]: any 
    }
}
    
/**
* An FBL Master Widget
*/
export class ClientConfig extends ReactWidget{
  constructor(
    config: IClientConfig
  ) {
    super();
    this.config = config;
    this.render();
  }

  protected render() {
    return (<ClientConfigComponent config={this.config}/>);
  }

  /**
  * The Elements associated with the widget.
  */
  private config: IClientConfig;
};




/**
 * Create React Component that renders client info in an accordian
 */
export function ClientConfigComponent(props: {
    config: IClientConfig;
}) {
    return (
        <>
        <Accordian>
            props.config.map
        </Accordian>
        </>
    );
}