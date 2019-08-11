import { JupyterLab, JupyterLabPlugin, ILayoutRestorer } from '@jupyterlab/application';
import { ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';
import { ReadonlyJSONObject, JSONObject, JSONValue } from '@phosphor/coreutils';
import { Widget, Menu } from '@phosphor/widgets';
import { ILauncher } from '@jupyterlab/launcher';
import { IMainMenu, JupyterLabMenu } from '@jupyterlab/mainmenu';
import { showDialog, Dialog } from '@jupyterlab/apputils';
import { ServiceManager, ServerConnection } from '@jupyterlab/services';
// import { NotebookPanel } from '@jupyterlab/notebook';
import { find } from '@phosphor/algorithm';
import PerfectScrollbar from 'perfect-scrollbar';
import { JSONExt } from '@phosphor/coreutils';

import { FFBOLabWidget, IFFBOChildWidget } from './widget';

// export model and widgets so that other child modules can import these settings
export * from './model';
export * from './widget';

// import css files
import '../style/index.css';
import '../style/izitoast.min.css';
import '../style/jsoneditor.css';
import '../style/perfectscrollbar.css';
import { NotebookPanel } from '@jupyterlab/notebook';
import { IStateDB } from '@jupyterlab/coreutils';

const VERBOSE = false;

/**
 * The class name for the FFBOLab icon in the default theme.
 */
const FFBO_ICON_CLASS = 'jp-FFBOIcon';


declare global {
  interface Window {
    FFBOLabsession: any;
    FFBOLabWidget: any;
    FFBOLablayout: any;
    FFBOLabrestorer: any;
    _FFBOLABres: any;
    receivedFFBOLABMessage: any;
    FFBOLabTracker: any;
    JLabApp: any;
    ps: any;
    neurogfxWidget: any;
    testData: any;
  }
}
/**
 * Initialization data for FFBOLab Plugin
 */
const tracker: JupyterLabPlugin<WidgetTracker<FFBOLabWidget>> = {
  activate,
  id: '@jupyterlab/FFBOLab-extension:plugin',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer, IMainMenu, IStateDB],
  optional: [ILauncher]
};

export default tracker;

/**
 * The command IDs used by the notebook plugin.
 */
namespace CommandIDs {
  export
    const createNew = 'NeuroMynerva:create-master';

  export
    const closeAndShutdown = 'NeuroMynerva:close-and-shutdown-master';

  export
    const open = 'NeuroMynerva:open-master';

  export
    const maximize = 'NeuroMynerva:master-max';

  export
    const layout = 'NeuroMynerva:master-layout';

  export
    const restore = 'NeuroMynerva:master-layout-restore';

  export
    const kernel = 'NeuroMynerva:master-kernel';
  
  export
    const toggleInfo = 'NeuroMynerva:toggle-info';

  export
    const toggleGfx = 'NeuroMynerva:toggle-gfx';

  export
    const toggle3d = 'NeuroMynerva:toggle-3d';

  export
    const tabLayout = 'NeuroMynerva:tab-layout';

  export
    const panelLayout = 'NeuroMynerva:panel-layout';
}

/**
 * Activate the FFLab widget extension.
 */
function activate(app: JupyterLab,
  palette: ICommandPalette,
  restorer: ILayoutRestorer,
  menu: IMainMenu,
  state: IStateDB,
  launcher: ILauncher
): WidgetTracker<FFBOLabWidget> {
  if (VERBOSE) { console.log('[NM Master] NeuroMynerva extension activated!');}
  const namespace = 'NeuroMynerva';
  let tracker = new WidgetTracker<FFBOLabWidget>({ namespace });
  const services = app.serviceManager;
  let widget: FFBOLabWidget;

  window.JLabApp = app;

  // Add commands to command palette
  addCommands(widget, app, services, tracker, restorer, launcher, state, namespace);

  createMenu(app, menu);


  app.contextMenu.addItem({
    command: CommandIDs.maximize,
    selector: '.jp-FFBOLabMaster',
    rank: 0
  });

  app.contextMenu.addItem({
    command: CommandIDs.layout,
    selector: '.jp-FFBOLabMaster',
    rank: 0
  });

  app.contextMenu.addItem({
    command: CommandIDs.restore,
    selector: '.jp-FFBOLabMaster',
    rank: 0
  });

  app.contextMenu.addItem({
    command: CommandIDs.kernel,
    selector: '.jp-FFBOLabMaster',
    rank: 0
  });

  // Populate Command Palette
  populatePalette(palette);
  // Handle state restoration.
  restorer.restore(tracker, {
    command: CommandIDs.open,
    args: widget => ({ 
      path: widget.session.path
    }),
    name: () => ( namespace )
  });

  window.FFBOLabrestorer = restorer;

  return tracker;
};

function createMenu(app: JupyterLab, menu: IMainMenu): void {
  // TODO:
  let FFBOMenu = new JupyterLabMenu({ commands: app.commands });
  FFBOMenu.menu.title.label = 'Neuro';
  menu.addMenu(FFBOMenu.menu, { rank: 5 });

  FFBOMenu.addGroup(
    [{ command: 'apputils:reset' }],
    2
  );
  FFBOMenu.addGroup(
    [{ command: CommandIDs.toggleInfo }, { command: CommandIDs.toggle3d }, { command: CommandIDs.toggleGfx }],
    1
  );
  FFBOMenu.addGroup(
    [{ command: CommandIDs.tabLayout }, { command: CommandIDs.panelLayout }],
    0
  );
}

function addCommands(
  widget: FFBOLabWidget,
  app: JupyterLab,
  services: ServiceManager,
  tracker: WidgetTracker<FFBOLabWidget>,
  restorer: ILayoutRestorer,
  launcher: ILauncher,
  state: IStateDB,
  namespace: string
): void {
  const { commands, shell } = app;

  // Get the current widget and activate unless the args specify otherwise.
  function getCurrent(args: ReadonlyJSONObject): Widget | null {
    const widget = tracker.currentWidget;
    const activate = args['activate'] !== false;
    if (activate && widget) {
      shell.activateById(widget.id);
    }
    return widget;
  }

  /**
   * Whether there is an active FFBOLab Widget
   */
  function isEnabled(): boolean {
    return tracker.currentWidget !== null &&
      tracker.currentWidget === app.shell.currentWidget;
  }



  var nonexist_info = false;
  var nonexist_3d = false;
  var nonexist_gfx = false;
  
  /**
   * Create an NeuroMynerva Widget
   * @param {string} [path] Path pointing to the kernel session
   */
  function createMynerva(path?: string): Promise<FFBOLabWidget> {
    widget = new FFBOLabWidget({manager: services.sessions, path: path});
    let mainWidget = widget;
    return state.fetch('ffbo:state').then(_fetch => {
      // console.log(_fetch);
      // console.log(_fetch['neu3d']);
      // console.log(_fetch['neu3d'] != false);
      // console.log(_fetch['gfx']);
      // console.log(_fetch['gfx'] != false);
      // console.log(_fetch['info']);
      // console.log(_fetch['info'] != false);
      if(_fetch)
      {
        let _neu3d;
        let _neurogfx;
        let _info;

        if(_fetch['neu3d'] != false)
        {
          // console.log('[MASTER] Neu3D: NEW');
          _neu3d = commands.execute('NeuroMynerva:neu3d-open').then((widget:IFFBOChildWidget) => {
            widget.connect(mainWidget.outSignal);
            mainWidget.connectChild(widget.outSignal);
            if (VERBOSE) { console.log('[NM] Connected To [Neu3D]');}
            nonexist_3d = true;
            commands.notifyCommandChanged(CommandIDs.toggle3d);
          });
        }
        else
        {
          _neu3d = Promise.resolve(void 0);
        }

        if(_fetch['gfx'] != false)
        {
          // console.log('[MASTER] GFX: NEW');
          _neurogfx = commands.execute('NeuroMynerva:neurogfx-open').then((widget:IFFBOChildWidget) => {
            widget.connect(mainWidget.outSignal);
            if (VERBOSE) { console.log(widget);}
            nonexist_gfx = true;
            commands.notifyCommandChanged(CommandIDs.toggleGfx);
          });
        }
        else
        {
          _neurogfx = Promise.resolve(void 0);
        }

        if(_fetch['info'] != false)
        {
          // console.log('[MASTER] INFO: NEW');
          _info = commands.execute('NeuroMynerva:info-open').then((widget:IFFBOChildWidget) => {
            widget.connect(mainWidget.outSignal);
            mainWidget.connectChild(widget.outSignal);
            if (VERBOSE) { console.log('[NM] Connected To [Info]');}
            window.ps = new PerfectScrollbar(".jp-FFBOLabInfo");
            nonexist_info = true;
            commands.notifyCommandChanged(CommandIDs.toggleInfo);
          });
        }
        else
        {
          _info = Promise.resolve(void 0);
        }

        Promise.all([_neu3d, _neurogfx, _info, widget.ready]).then(() => {
          widget.propogateSession();
          commands.notifyCommandChanged(CommandIDs.toggle3d);
          commands.notifyCommandChanged(CommandIDs.toggleGfx);
          commands.notifyCommandChanged(CommandIDs.toggleInfo);
        });
    
        return widget.ready.then(() => {
          if (VERBOSE) { console.log('MASTER cascade');}
    
          if (!tracker.has(widget)) {
            // Track the state of the widget for later restoration
            if (VERBOSE) { console.log('!has widget');}
            tracker.add(widget);
          }
          if (!widget.isAttached) {
            // Attach the widget to the main work area if it's not there
            if (VERBOSE) { console.log('!isAttached');}
            shell.addToMainArea(widget);
          } else {
            // Refresh widget
            if (VERBOSE) { console.log('else: update');}
            widget.update();
          }
          // Activate the widget
          if (VERBOSE) { console.log('fallthrough: activate');}
          // widget.activate();
          app.commands.execute('docmanager:open', {
            path: widget.session.path,
            kernel: widget.session.kernel.model
          })
          .then((_nbk) => {
            // _nbk.ready.then(() => {
            _nbk.revealed.then(() => {
              widget.updateNotebook(_nbk);
              // widget.activate();
              app.shell.activateById(widget.id);
              // commands.execute(CommandIDs.panelLayout);
              if (VERBOSE) { 
                console.log(document.activeElement);
              }
            });
          })
          .catch((error) => {
            console.error('[NM] Failed to open notebook with given path: {' + widget.session.path + '}');
            console.error(error);
          });
    
          // focus on master
          widget.activate();
          window.FFBOLabTracker = tracker;
          window.FFBOLabWidget = widget;
          window.JLabApp = app;
          window.ps = new PerfectScrollbar(".jp-FFBOLabMaster");
          return widget;
        });
      }
      else
      {
        let _neu3d = commands.execute('NeuroMynerva:neu3d-open').then((widget:IFFBOChildWidget) => {
          widget.connect(mainWidget.outSignal);
          mainWidget.connectChild(widget.outSignal);
          if (VERBOSE) { console.log('[NM] Connected To [Neu3D]');}
          nonexist_3d = true;
          commands.notifyCommandChanged(CommandIDs.toggle3d);
        });
        let _neurogfx = commands.execute('NeuroMynerva:neurogfx-open').then((widget:IFFBOChildWidget) => {
          widget.connect(mainWidget.outSignal);
          if (VERBOSE) { console.log(widget);}
          nonexist_gfx = true;
          commands.notifyCommandChanged(CommandIDs.toggleGfx);
        });
        let _info = commands.execute('NeuroMynerva:info-open').then((widget:IFFBOChildWidget) => {
          widget.connect(mainWidget.outSignal);
          mainWidget.connectChild(widget.outSignal);
          if (VERBOSE) { console.log('[NM] Connected To [Info]');}
          window.ps = new PerfectScrollbar(".jp-FFBOLabInfo");
          nonexist_info = true;
          commands.notifyCommandChanged(CommandIDs.toggleInfo);
        });
    
        Promise.all([_neu3d, _neurogfx, _info, widget.ready]).then(() => {
          widget.propogateSession();
        });
    
        return widget.ready.then(() => {
          if (VERBOSE) { console.log('MASTER cascade');}
    
          if (!tracker.has(widget)) {
            // Track the state of the widget for later restoration
            if (VERBOSE) { console.log('!has widget');}
            tracker.add(widget);
          }
          if (!widget.isAttached) {
            // Attach the widget to the main work area if it's not there
            if (VERBOSE) { console.log('!isAttached');}
            shell.addToMainArea(widget);
          } else {
            // Refresh widget
            if (VERBOSE) { console.log('else: update');}
            widget.update();
          }
          // Activate the widget
          if (VERBOSE) { console.log('fallthrough: activate');}
          // widget.activate();
          app.commands.execute('docmanager:open', {
            path: widget.session.path,
            kernel: widget.session.kernel.model
          })
          .then((_nbk) => {
            // _nbk.ready.then(() => {
            _nbk.revealed.then(() => {
              widget.updateNotebook(_nbk);
              // widget.activate();
              app.shell.activateById(widget.id);
              // commands.execute(CommandIDs.panelLayout);
              if (VERBOSE) { 
                console.log(document.activeElement);
              }
            });
          })
          .catch((error) => {
            console.error('[NM] Failed to open notebook with given path: {' + widget.session.path + '}');
            console.error(error);
          });
    
          // focus on master
          widget.activate();
          window.FFBOLabTracker = tracker;
          window.FFBOLabWidget = widget;
          window.JLabApp = app;
          window.ps = new PerfectScrollbar(".jp-FFBOLabMaster");
          return widget;
        });
      }
    });
  }

  /**
   * Open An existing widget sets
   */
  commands.addCommand(CommandIDs.open, {
    execute: (args: JSONObject) => {
      // console.log('MASTER OPEN call');
      let path = args['path'];
      let _widget;
      if(!widget)
      {
        // Create a new widget if one does not exist
        if(path)
        {
           _widget = createMynerva(path as string);
        }
        else
        {
          _widget = createMynerva();
        }
      }
      else
      {
        _widget = Promise.resolve(void 0);
      }
      return _widget;
    }
  });

  /**
   * Open An existing widget sets
   */

  commands.addCommand(CommandIDs.toggleInfo, {
    label: 'Info Panel Widget',
    execute: () => {
      if(widget && !widget.isDisposed) {
        let keys = Array.from((<any>restorer)._widgets.keys());
        if (VERBOSE) { console.log(keys);}
  
        nonexist_info = true;

        keys.forEach(function(value) {
          if((<string>value).startsWith('NeuroMynerva-info'))
          {
            nonexist_info = false;
          }
        });
  
        if(nonexist_info)
        {
          commands.execute('NeuroMynerva:info-open').then((child:IFFBOChildWidget) => {
            child.connect(widget.outSignal);
            widget.connectChild(child.outSignal);
            widget.propogateSession();
            if (VERBOSE) { console.log('[NM] Connected To [Info]');}
            window.ps = new PerfectScrollbar(".jp-FFBOLabInfo");
          });
        }
        else
        {
          commands.execute('NeuroMynerva:info-open').then((child:IFFBOChildWidget) => {
            child.dispose();
          });
        }
      }
      commands.notifyCommandChanged(CommandIDs.toggleInfo);
    },
    isToggled: () => {
      let keys = Array.from((<any>restorer)._widgets.keys());
      if (VERBOSE) { console.log(keys);}

      let toggle = true;

      keys.forEach(function(value) {
        if((<string>value).startsWith('NeuroMynerva-info'))
        {
          // if(!(<any>restorer)._widgets.get(value).isDisposed)
          // {
            toggle = false;
          // }
        }
      });

      return !toggle;
    },
  });

  commands.addCommand(CommandIDs.toggle3d, {
    label: 'Neu3D Widget',
    execute: () => {
      if(widget && !widget.isDisposed) {
        let keys = Array.from((<any>restorer)._widgets.keys());
        if (VERBOSE) { console.log(keys);}
  
        nonexist_3d = true;

        keys.forEach(function(value) {
          if((<string>value).startsWith('NeuroMynerva-neu3d'))
          {
            // if(!(<any>restorer)._widgets.get(value).isDisposed)
            // {
              nonexist_3d = false;
            // }
          }
        });
  
        if(nonexist_3d)
        {
          commands.execute('NeuroMynerva:neu3d-open').then((child:IFFBOChildWidget) => {
            child.connect(widget.outSignal);
            widget.connectChild(child.outSignal);
            widget.propogateSession();
            if (VERBOSE) { console.log('[NM] Connected To [Neu3D]');}
          });
        }
        else
        {
          commands.execute('NeuroMynerva:neu3d-open').then((child:IFFBOChildWidget) => {
            child.dispose();
          });
        }
      }
      commands.notifyCommandChanged(CommandIDs.toggle3d);
    },
    isToggled: () => {
      let keys = Array.from((<any>restorer)._widgets.keys());
      if (VERBOSE) { console.log(keys);}

      let toggle = true;

      keys.forEach(function(value) {
        if((<string>value).startsWith('NeuroMynerva-neu3d'))
        {
          // if(!(<any>restorer)._widgets.get(value).isDisposed)
          // {
            toggle = false;
          // }
        }
      });

      return !toggle;
    },
  });

  commands.addCommand(CommandIDs.toggleGfx, {
    label: 'NeuroGFX Widget',
    execute: () => {
      if(widget && !widget.isDisposed) {
        let keys = Array.from((<any>restorer)._widgets.keys());
        if (VERBOSE) { console.log(keys);}
  
        nonexist_gfx = true;

        keys.forEach(function(value) {
          if((<string>value).startsWith('NeuroMynerva-gfx'))
          {
            nonexist_gfx = false;
          }
        });
  
        if(nonexist_gfx)
        {
          commands.execute('NeuroMynerva:neurogfx-open').then((child:IFFBOChildWidget) => {
            child.connect(widget.outSignal);
            widget.propogateSession();
        if (VERBOSE) { console.log(widget);}
          });
        }
        else
        {
          commands.execute('NeuroMynerva:neurogfx-open').then((child:IFFBOChildWidget) => {
            child.dispose();
          });
        }
      }
      commands.notifyCommandChanged(CommandIDs.toggleGfx);
    },
    isToggled: () => {
      let keys = Array.from((<any>restorer)._widgets.keys());
      if (VERBOSE) { console.log(keys);}

      let toggle = true;

      keys.forEach(function(value) {
        if((<string>value).startsWith('NeuroMynerva-gfx'))
        {
          // if(!(<any>restorer)._widgets.get(value).isDisposed)
          // {
            toggle = false;
          // }
        }
      });

      return !toggle;
    },
  });

  commands.addCommand(CommandIDs.panelLayout, {
    label: 'Load Panel Layout',
    execute: () => {
      if (VERBOSE) { console.log('attempt restore');}

      let rightArr = ["NeuroMynerva-info:NeuroMynerva-info"]
      let leftArr = ["filebrowser","running-sessions","command-palette","tab-manager","extensionmanager.main-view"];
      if (VERBOSE) { console.log(window.FFBOLabrestorer._widgets);}

      let keys = Array.from(window.FFBOLabrestorer._widgets.keys());
      if (VERBOSE) { console.log(keys);}

      const prefArr = [['NeuroMynerva:'],[],['NeuroMynerva-neu3d:'],['NeuroMynerva-gfx:']];
      // let count = 0;
      let widgetArr = [[],[],[],[]];
      let extraIndex = 1;

      keys.forEach(function(value) {
        if((leftArr.indexOf(<string>value)) < 0 && (rightArr.indexOf(<string>value)) < 0)
        {
          let foundPreference = false;
          prefArr.forEach(function(element, index) {
            element.forEach(function(innerEle, innerIdx) {
              if(!foundPreference && typeof innerEle == 'string' && (<string>value).startsWith(<string>innerEle))
              {
                // console.log(innerEle, index);
                foundPreference = true;
                widgetArr[index].push(value);
              }
            });
          });

          if(!foundPreference) {
            widgetArr[extraIndex].push(value);
          }
        }
      });

      let finalArr = [];
      let currShift = [];
      let len = widgetArr.length;

      for(let i = 0; i < len; i++)
      {
        currShift = widgetArr.shift();
        if(currShift.length > 0)
        {
          finalArr.push(currShift);
        }
      }
      let count = finalArr.length;
      // console.log(finalArr);

      let testMain = {dock: {}};
      let testLayout = testMain.dock;

      if(count == 1)
      {
        commands.execute(CommandIDs.tabLayout);
        return;
      }
      else if(count == 2)
      {
        pushTabArea(pushTabArea(createHorizontal(testLayout, 2), finalArr[0]), finalArr[1]);
      }
      else if(count == 3)
      {
        // pushTabArea(pushTabArea(pushTabArea(createHorizontal(testLayout, 3), finalArr[0]), finalArr[1]), finalArr[2]);
        let tempRoot = createHorizontal(testLayout, 2);
        pushTabArea(pushTabArea(pushVertical(tempRoot, 2), finalArr[0]), finalArr[1]);
        pushTabArea(tempRoot, finalArr[2]);
      }
      else if(count >= 4)
      {
        let tempRoot = createVertical(testLayout, 2);
        pushTabArea(pushTabArea(pushHorizontal(tempRoot, 2), finalArr[0]), finalArr[1]);
        pushTabArea(pushTabArea(pushHorizontal(tempRoot, 2), finalArr[2]), finalArr[3]);
      }
      else
      {
        console.error('RESTORE FAILED, NO WIDGETS FOUND!');
        return;
      }

      const left = JSON.parse('{"collapsed":true,"widgets":["filebrowser","running-sessions","command-palette","tab-manager"]}');
      const right = JSON.parse('{"collapsed":true,"widgets":["NeuroMynerva-info:NeuroMynerva-info"]}');
      const main = testMain;

      // console.warn(testMain);
      // const {main, left, right} = JSON.parse(dehydrated);
      const fresh = false;
      const mainArea = window.FFBOLabrestorer._rehydrateMainArea(main);
      const leftArea = window.FFBOLabrestorer._rehydrateSideArea(left);
      const rightArea = window.FFBOLabrestorer._rehydrateSideArea(right);

      let newLayout = {fresh,mainArea,leftArea,rightArea};
      if (VERBOSE) { console.log(newLayout);}

      window.JLabApp.shell.restoreLayout(newLayout);
    }
  });

  commands.addCommand(CommandIDs.tabLayout, {
    label: 'Load Tab Layout',
    execute: () => {
      if (VERBOSE) { console.log('attempt restore');}
      let startJSON = '{"main":{"dock":{"type":"tab-area","currentIndex":0,"widgets":["NeuroMynerva:NeuroMynerva"';
      let endJSON = ',"NeuroMynerva-neu3d:NeuroMynerva-neu3d","NeuroMynerva-gfx:NeuroMynerva-gfx"]},"mode":"multiple-document","current":"notebook:Untitled59.ipynb"},"left":{"collapsed":true,"widgets":["filebrowser","running-sessions","command-palette","tab-manager"]},"right":{"collapsed":true,"widgets":["NeuroMynerva-info:NeuroMynerva-info"]}}';

      let widgetArr = ['NeuroMynerva:NeuroMynerva', "NeuroMynerva-neu3d:NeuroMynerva-neu3d", "NeuroMynerva-info:NeuroMynerva-info", "NeuroMynerva-gfx:NeuroMynerva-gfx", "filebrowser","running-sessions","command-palette","tab-manager","extensionmanager.main-view"];
      if (VERBOSE) { console.log(window.FFBOLabrestorer._widgets);}

      let keys = Array.from(window.FFBOLabrestorer._widgets.keys());
      if (VERBOSE) { console.log(keys);}

      let dehydrated = '';
      keys.forEach(function(value) {
        if((widgetArr.indexOf(<string>value)) < 0)
        {
          startJSON += ',' + '"' + <string>value + '"';
        }
      });

      dehydrated = startJSON + endJSON;
      const {main, left, right} = JSON.parse(dehydrated);
      const fresh = false;
      const mainArea = window.FFBOLabrestorer._rehydrateMainArea(main);
      const leftArea = window.FFBOLabrestorer._rehydrateSideArea(left);
      const rightArea = window.FFBOLabrestorer._rehydrateSideArea(right);

      let newLayout = {fresh,mainArea,leftArea,rightArea};
      if (VERBOSE) { console.log(newLayout);}

      window.JLabApp.shell.restoreLayout(newLayout);
    }
  });

  // Add an application command
  commands.addCommand(CommandIDs.maximize, {
    label: 'Toggle Master Focus',
    execute: () => {
      // if (VERBOSE) { console.log(widget);}
      // if(widget.node.classList.contains('panel-fullscreen')) {
      //   widget.node.classList.remove('panel-fullscreen');
      // }
      // else {
      //   widget.node.classList.add('panel-fullscreen');
      // }
      window.JLabApp.commands.execute('application:toggle-mode');
    }
  });

  // Add an application command
  commands.addCommand(CommandIDs.layout, {
    label: 'Save Layout',
    execute: () => {
      if (VERBOSE) { console.log(app.shell.saveLayout());}
      window.FFBOLablayout = app.shell.saveLayout();
      
      let main = window.FFBOLabrestorer._dehydrateMainArea(window.FFBOLablayout.mainArea);
      let left = window.FFBOLabrestorer._dehydrateSideArea(window.FFBOLablayout.leftArea);
      let right = window.FFBOLabrestorer._dehydrateSideArea(window.FFBOLablayout.rightArea);

      if (VERBOSE) { console.log({main, left, right});}
    }
  });

  // Add an application command
  commands.addCommand(CommandIDs.restore, {
    label: 'Restore Layout',
    execute: () => {
      if (VERBOSE) { console.log('Old Layout');}
      if (VERBOSE) { console.log(window.FFBOLablayout);}
      app.shell.restoreLayout(window.FFBOLablayout);
      if (VERBOSE) { console.log('New Layout');}
      if (VERBOSE) { console.log(app.shell.saveLayout());}
    }
  });

  let kerneltest = true;
  // Add an application command
  commands.addCommand(CommandIDs.kernel, {
    label: 'Log Kernel',
    isToggled: () => kerneltest,
    execute: () => {
      kerneltest = !kerneltest;
      if (VERBOSE) { console.log(widget.session.kernel);}
      commands.notifyCommandChanged(CommandIDs.kernel);
    },
    isEnabled
  });

  /**
   * On Launch, the object does the following:
   *
   * 1. Create Notebook
   * 2. Spawn Widgets based on Notebook
   */
  commands.addCommand(CommandIDs.createNew, {
    execute: () => {
      widget = new FFBOLabWidget({manager: services.sessions});
      let mainWidget = widget;
      let _neu3d = commands.execute('NeuroMynerva:neu3d-open').then((widget:IFFBOChildWidget) => {
        widget.connect(mainWidget.outSignal);
        mainWidget.connectChild(widget.outSignal);
        if (VERBOSE) { console.log('[NM] Connected To [Neu3D]');}
        nonexist_3d = true;
        commands.notifyCommandChanged(CommandIDs.toggle3d);
      });
      let _neurogfx = commands.execute('NeuroMynerva:neurogfx-open').then((widget:IFFBOChildWidget) => {
        widget.connect(mainWidget.outSignal);
        if (VERBOSE) { console.log(widget);}
        nonexist_gfx = true;
        commands.notifyCommandChanged(CommandIDs.toggleGfx);
      });
      let _info = commands.execute('NeuroMynerva:info-open').then((widget:IFFBOChildWidget) => {
        widget.connect(mainWidget.outSignal);
        mainWidget.connectChild(widget.outSignal);
        if (VERBOSE) { console.log('[NM] Connected To [Info]');}
        window.ps = new PerfectScrollbar(".jp-FFBOLabInfo");
        nonexist_info = true;
        commands.notifyCommandChanged(CommandIDs.toggleInfo);
      });
  
      Promise.all([_neu3d, _neurogfx, _info, widget.ready]).then(() => {
        state.save('ffbo:state', {info: true, gfx: true, neu3d: true});
        widget.propogateSession();
      });
  
      return widget.ready.then(() => {
        if (VERBOSE) { console.log('MASTER cascade');}
  
        if (!tracker.has(widget)) {
          // Track the state of the widget for later restoration
          if (VERBOSE) { console.log('!has widget');}
          tracker.add(widget);
        } else {
          // Refresh widget
          if (VERBOSE) { console.log('else: update');}
          widget.update();
        }
        // Activate the widget
        if (VERBOSE) { console.log('fallthrough: activate');}
        // widget.activate();
        app.commands.execute('docmanager:open', {
          path: widget.session.path,
          kernel: widget.session.kernel.model
        })
        .then((_nbk) => {
          _nbk.revealed.then(() => {
            widget.updateNotebook(_nbk);
            if (VERBOSE) { 
              console.log(document.activeElement);
            }
            // focus on master
            // widget.activate();
            window.FFBOLabTracker = tracker;
            window.FFBOLabWidget = widget;
            window.JLabApp = app;
            app.shell.activateById(widget.id);
            commands.execute(CommandIDs.panelLayout);
            // window.ps = new PerfectScrollbar(".jp-FFBOLabMaster");
          });
        })
        .catch((error) => {
          console.error('[NM] Failed to open notebook with given path: {' + widget.session.path + '}');
          console.error(error);
        });
      return widget;
      });
    },
    // label: 'Create New Workspace',
    label: 'Create New',
    iconClass: FFBO_ICON_CLASS
  });

  /**
   * Close and shutdown everything
   */
  commands.addCommand(CommandIDs.closeAndShutdown, {
    label: 'Close and Shut Down Workspace',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return Promise.reject('No Current Widget Found');
      }

      const fileName = current.title.label;

      return showDialog({
        title: 'Shutdown the NeuroMynerva session?',
        body: `Are you sure you want to NeuroMynerva session "${fileName}"?`,
        buttons: [Dialog.cancelButton(), Dialog.warnButton()]
      }).then(result => {
        if (result.button.accept) {
          current.dispose();
        }
        // if (notebook){
        //   notebook.dispose();
        // }
      });
    },
    isEnabled
  });

  if (launcher) {
    launcher.add({
      command: CommandIDs.createNew,
      category: 'FFBO',
      rank: 0
    });
  }
}

/**
 * Populate the application's command palette
 */
function populatePalette(palette: ICommandPalette): void {
  let category = 'NeuroMynerva Operations';
  [
    CommandIDs.closeAndShutdown
  ].forEach(command => { palette.addItem({ command, category }); });
}

function createVertical(root, num) {
  let tempArr = Array(num);
  tempArr.fill(1/num);
  Object.assign(root, {type: 'split-area', orientation: 'vertical', sizes:tempArr, children: []});
return root.children;
}

function createHorizontal(root, num) {
  let tempArr = Array(num);
  tempArr.fill(1/num);
  Object.assign(root, {type: 'split-area', orientation: 'horizontal', sizes:tempArr, children: []});
return root.children;
}

function pushVertical(root, num) {
  let tempArr = Array(num);
  tempArr.fill(1/num);
  let tempReturn = root.push({type: 'split-area', orientation: 'vertical', sizes:tempArr, children: []});
  return root[tempReturn -1].children;
}

function pushHorizontal(root, num) {
  let tempArr = Array(num);
  tempArr.fill(1/num);
  let tempReturn = root.push({type: 'split-area', orientation: 'horizontal', sizes:tempArr, children: []});
  return root[tempReturn -1].children;
}

function pushTabArea(root, widgetArr) {
  root.push({type: 'tab-area', currentIndex: 0, widgets: widgetArr});
  return root;
}