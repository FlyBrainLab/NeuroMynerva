import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Widget
} from '@phosphor/widgets';

import {
  ICommandPalette
} from '@jupyterlab/apputils';

import '../style/index.css';

/**
 * Save the text in the widget.
 * @param {Widget} wid - The widget object containing the form.
 * @param {string[]} tags - Types of input in the form.
 */
function saveText(wid: Widget, tags: string[]){
  let state: any = {};
  for(let tag of tags){
    let els = wid.node.getElementsByTagName(tag);
    Array.from(els).forEach((el) => {
      state[(<HTMLInputElement>el).name] = (<HTMLInputElement>el).value;
    });
  }
  console.log(state);
}


/**
 * Change the styling of the dropdown menu on selection
 * @param {Widget} wid - The widget object containing the form.
 */
function getSelects(wid: Widget){
  let els = wid.node.getElementsByTagName('select');
  Array.from(els).forEach((el) => {
      el.addEventListener("change", () => {
        el.style.color = "#000";
      });
  });
}

/**
 * Creates the options menu inside the widget.
 * @param {Widget} wid - The widget object containing the form.
 * @param {any} fd - The JSON objecte detailing the various options in the menu.
 */
function createForm(wid: Widget, fd: any){
  wid.node.style.overflowY = "auto";

  let form = document.createElement('form');
  let innerHTML = "<form><div class='container'><h1>Options</h1><hr>";

  //Fill in form
  for(var i = 0; i < fd.fields.length; i++){
    if(fd.types[i] == "select"){
      let label = "<label for='" + fd.fields[i] + "'><b>" + fd.fields[i] + "</b></label>";
      let input = "<select name='" + fd.fields[i] + "'>";
      innerHTML += label + input;
      innerHTML += "<option>" + fd.fields[i] + "</option>";
      let options = fd.dropdown_options[fd.fields[i]];
      for(var j = 0; j < options.length; j++){
        let option = "<option value='" + options[j] + "'>" + options[j] + "</option>";
        innerHTML += option;
      }
      innerHTML += "</select>";
    }else{
      let label = "<label for='" + fd.fields[i] + "'><b>" + fd.fields[i] + "</b></label>";
      let input = "<input type='" + fd.types[i] + "' placeholder='" + fd.fields[i] + "' name='" + fd.fields[i] + "' required=''>";
      innerHTML += label;
      innerHTML += input;
    }

  }
  innerHTML += "<hr><button type='button' class='savebtn'><b>Save</b></button></div></form>";
  form.innerHTML = innerHTML;
  wid.node.appendChild(form);
}


/**
 * Initialization data for the menu-extension extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'menu-extension',
  autoStart: true,
  requires: [ICommandPalette],
  activate: (app: JupyterLab, palette: ICommandPalette) => {
    console.log('JupyterLab extension menu-extension is activated!');
    console.log('ICommandPalette:', palette);

  // Create a single widget
  let widget: Widget = new Widget();
  widget.id = 'options-menu';
  widget.title.label = 'Options Menu';
  widget.title.closable = true;


  //Type index must be same as corresponding title. 
  let form_details = {
    "title" : "Options",
    "types": ["text", "password", "text", "select", "text", "text", "text"],
    "fields" : ["Account Name", "Password", "Adult Processor Server Address", "Test Dropdown", 
    "Larva Processor Server Address", "GFX Server Address", "Graphics Options"],
    "dropdown_options": {"Test Dropdown": ["Option 1", "Option 2", "Option 3"]}
  };

  createForm(widget, form_details);
  getSelects(widget);
  //Save text
  let button = <HTMLElement>widget.node.querySelector("button");
  button.addEventListener("click", () => {
    saveText(widget, ['input', 'select']);
  });

  // Add an application command
  const command: string = 'options-menu:open';
  app.commands.addCommand(command, {
    label: 'Options Menu',
    execute: () => {
      if (!widget.isAttached) {
        // Attach the widget to the main work area if it's not there
        app.shell.addToMainArea(widget);
      }
      // Activate the widget
      app.shell.activateById(widget.id);
    }
  });

  // Add the command to the palette.
  palette.addItem({command, category: 'Menu'});

  }
};

export default extension;
