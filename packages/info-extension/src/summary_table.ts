import * as $ from "jquery";
import { INeuroInfoSubWidget, NeuroInfoWidget } from "./widget";
import { Widget } from '@phosphor/widgets';
import { JSONObject } from '@phosphor/coreutils';

const SUMMARY_NEU_ID = "info-panel-summary-neu-col";
const SUMMARY_TABLE_ID = "info-panel-summary-table";
const SUMMARY_IMG_ID = "info-panel-extra-img";


/**
 * SummaryTable Information Constructor
 */
export class SummaryTable extends Widget implements INeuroInfoSubWidget{
  constructor(parent: NeuroInfoWidget) {
    super();

    this.parentObj = parent;

    this.colorId = SUMMARY_NEU_ID;
    this.tabId = SUMMARY_TABLE_ID;
    this.extraImgId = SUMMARY_IMG_ID;
    
    this.container = this.node.parentElement;
    this.reset();
  }
  
  /*
    * Reset SummaryTable Table
    */
  reset() {
    this.node.innerHTML = "";
    if (!this._hasData){
      // let imgDiv = document.createElement("img");
      // imgDiv.src = "../style/img/ffbo_logo.png";
      // imgDiv.src = "https://ffbolab.neurogfx.fruitflybrain.org/flylablogo_basic.png";

      // imgDiv.innerText = "Detailed neuron info to appear here ...";
      // this.node.appendChild(imgDiv);
    }

    let tabDiv = document.createElement('div');
    tabDiv.id = this.tabId;
    tabDiv.setAttribute("class","table-grid");
    this.node.appendChild(tabDiv);
    let extraTabDiv = document.createElement('div');
    extraTabDiv.id = this.extraImgId;
    this.node.appendChild(extraTabDiv);


    let _div = document.createElement('div');
    _div.style.display = "none";
    let _div2 = document.createElement("h4");
    _div2.innerText = "Confocal Image";
    _div.appendChild(_div2);
    let _div3 = document.createElement("img");
    _div3.setAttribute("class","clickable-image");
    _div3.setAttribute("tryCtr", "0");
    _div3.setAttribute("maxTry", "1");
    _div.appendChild(_div3);

    extraTabDiv.appendChild(_div);

    _div = document.createElement('div');
    _div.style.display = "none";
    _div2 = document.createElement("h4");
    _div2.innerText = "Segmentation";
    _div.appendChild(_div2);
    _div3 = document.createElement("img");
    _div3.setAttribute("class", "clickable-image");
    _div3.setAttribute("tryCtr", "0");
    _div3.setAttribute("maxTry", "1");
    _div.appendChild(_div3);
    extraTabDiv.appendChild(_div);

    _div = document.createElement('div');
    _div.style.display = "none";
    _div2 = document.createElement("h4");
    _div2.innerText = "Skeleton";
    _div.appendChild(_div2);
    _div3 = document.createElement("img");
    _div3.setAttribute("class", "clickable-image");
    _div3.setAttribute("tryCtr", "0");
    _div3.setAttribute("maxTry", "1");
    _div.appendChild(_div3);
    extraTabDiv.appendChild(_div);
  }

  updateColor(rid: string, color: string)
  {
    let colorPicker = this.node.querySelector('#'+this.colorId) as HTMLInputElement;
    // console.log(color);
    this.color = '#' + color;
    if(colorPicker)
    {
      if(colorPicker.dataset.rid == rid)
      {
        colorPicker.value = '#' + color;
      }
    }
  }

  /**
   * SummaryTable Information Update
   *
   */
  updateData(data: JSONObject) {
    if (Private.verifyDataIntegrity_ST(data) == false) {
      return;
    }
    this.reset();
    this.show();
    // extra name and color
    let objName = ('uname' in data) ? data['uname'] : data['name'];
    if (data['class'] === 'Synapse') {
      objName = (<string>objName).split("--")[0] + " to " + (<string>objName).split("--")[1];
    }
    let objRId = data['rid'];

    // let objColor = this.parentObj.getAttr(<string>objRId, 'color');

    let objColor = "#ffffff";
    if(this.color)
    {
      objColor = this.color;
    }

    let tableHtml = '<div> <p>Name :</p><p>' + objName;

    // FIXME: need to solve this communication problem with parent object 
    if (this.parentObj.isInWorkspace(<string>objRId)) {
    // if(true){
      tableHtml += '<button class="btn btn-remove btn-danger" id="btn-remove-' + objName + '" name="' + objName + '" data-rid="'+ objRId +'" style="margin-left:20px;">-</button>';
      tableHtml += '</p></div>';
      if (objColor) {
        // add choose color
        tableHtml += '<div><p>Choose Color:</p><p> <input class="color_inp_show" type="color"';
        tableHtml += 'name="neu_col" id="' + this.colorId + '" value="' + objColor + '" data-rid="'+ objRId +'"/></p></div>';
      }
    }
    else {
      tableHtml += '<button class="btn btn-add btn-success" id="btn-add-' + objName + '" name="' + objName + '" data-rid="'+ objRId +'" style="margin-left:20px;">+</button>';
      tableHtml += '</p></div>';
      if (objColor) {
        // add choose color
        tableHtml += '<div><p>Choose Color:</p><p> <input class="color_inp_hide" type="color"';
        tableHtml += 'name="neu_col" id="' + this.colorId + '" value="' + objColor + '" data-rid="'+ objRId +'"/></p></div>';
      }
    }
    // tableHtml += '<button class="btn btn-add btn-success" id="btn-add-' + objName + '" name="' + objName + '" style="margin-left:20px;">+</button>';
    let displayKeys = ['class', 'vfb_id', 'data_source', 'transgenic_lines', 'transmitters', 'expresses'];
    for (let key of displayKeys) {
      if (!(key in data) || data[key] == 0) {
        continue;
      }
      let fieldName = Private.snakeToSentence(key);
      let fieldValue = data[key];
      if (key === 'vfb_id') {
        let vfbBtn = "<a target='_blank' href='http://virtualflybrain.org/reports/" + data[key] + "'>VFB link</a>";
        fieldName = 'External Link';
        fieldValue = vfbBtn;
      }
      tableHtml += "<div><p>" + fieldName + ":</p><p>" + fieldValue + "</p></div>";
    }
    document.getElementById(this.tabId).innerHTML = tableHtml;

    // flycircuit data
    if (('data_source' in data) && ((<string>data['data_source']).indexOf("FlyCircuit") > -1)) { // see if flycircuit is in
      let extraTableHtml = "";
      let extraData = <JSONObject>data['flycircuit_data'];
      let extraKeys = ["Lineage", "Author", "Driver", "Gender/Age", "Soma Coordinate", "Putative birth time", "Stock"];
      if (!('error' in extraData)) {
        // Fetch Key:value pair for flycircuit_data and add to
        for (let key of extraKeys) {
          if (!(key in extraData) || extraData[key] == 0) {
            continue;
          }
          extraTableHtml += "<div><p>" + key + ":</p><p>" + extraData[key] + "</p></div>";
        }
        document.getElementById(this.tabId).innerHTML = document.getElementById(this.tabId).innerHTML + extraTableHtml;
        // set source for images
        if ("Images" in extraData) {
          let imgList = ["Original confocal image (Animation)", "Segmentation", "Skeleton (download)"];
          let current_obj = this;
          imgList.forEach(function(imgName, idx){
              (document.getElementById(current_obj.extraImgId).getElementsByTagName("img")[idx]).onerror = function () {
              this.parentElement.style.display = "none";
              if (Number(this.getAttribute("tryCtr")) < Number(this.getAttribute("maxTry"))) { // try 5 times max
                let currTry = Number(this.getAttribute("tryCtr"));
                setTimeout(() => {
                  (<HTMLImageElement>this).src = (<string>(<JSONObject>extraData["Images"])[imgName]);
                }, 1000);
                this.setAttribute("tryCtr", String(currTry += 1));
                return;
              }
              else {
                this.setAttribute("tryCtr", "0");
                return;
              }
            };
            (document.getElementById(current_obj.extraImgId).getElementsByTagName("img")[idx]).onload = function () {
              this.setAttribute("tryCtr", "0");
              //console.log("[InfoPanel.SummaryTable > Success] Image "+ imgName);
              this.parentElement.style.display = "block";
            };
            if ((<JSONObject>extraData["Images"])[imgName]) {
              let _source = (<JSONObject>extraData["Images"])[imgName];
              (<HTMLImageElement>$('#' + current_obj.extraImgId + " img")[idx]).src = "https://neuronlp.fruitflybrain.org"+<string>_source;
            }
            else {
              ($('#' + current_obj.extraImgId + " img")[idx]).style.display = "none";
            }
          });
          document.getElementById(current_obj.extraImgId).style.display = "";
        }
      }
    }else{
      document.getElementById(this.extraImgId).style.display = "none";
    }
    this.setupCallbacks();
  }
  
  /**
   * Setup Callback for add remove button
   */
  setupCallbacks() {
    // FIXME: redo this better
    let infoWidget = this.parentObj;
    let infoBtn = this.node.getElementsByTagName("button")[0];
    let colorPicker = this.node.querySelector('#' + SUMMARY_NEU_ID) as HTMLElement;
    // console.log(infoBtn);
    if(infoBtn)
    {
      infoBtn.onclick = (event) => {
        // console.log(event);
        if(infoBtn.className.search('add') != -1)
        {
          // console.log('added');
          infoWidget.addByUname(infoBtn.name, infoBtn.dataset.rid);
          infoBtn.className = "btn btn-remove btn-danger";
          infoBtn.id = "btn-remove-" + infoBtn.name;
          infoBtn.innerText = '-';
          colorPicker.className = 'color_inp_show';
        }
        else
        {
          // console.log('removed');
          infoWidget.removeByUname(infoBtn.name, infoBtn.dataset.rid);
          infoBtn.className = "btn btn-add btn-success";
          infoBtn.id = "btn-add-" + infoBtn.name;
          infoBtn.innerText = '+';
          colorPicker.className = 'color_inp_hide';
        }
      }
    }

    // console.log(colorPicker);
    // console.log(colorPicker.dataset.rid);
    let infoColor;
    if(colorPicker)
    {
      let infoRid = colorPicker.dataset.rid;
      colorPicker.onchange = (event) => {
        // console.log(event);
        // console.log((event.target as HTMLInputElement).value);
        infoColor = (event.target as HTMLInputElement).value;
        (<any>infoWidget)._userAction.emit({action:'forward', target: 'NLP-forward', content: { command: 'color', rid: infoRid, color: infoColor}});
        this.color = infoColor;
      };
    }
    // this.node.getElementsByTagName("button")[0].setAttribute("onClick", "if (this.className.search('add') != -1) {that.parentObj.addByUname((<HTMLImageElement>this).name);}else {that.parentObj.removeByUname((<HTMLImageElement>this).name);}");
  }

  /**
   * Elements for the widget
   */
  readonly container: HTMLElement;
  private _hasData = false;
  private parentObj: NeuroInfoWidget;
  private htmlTemplate: string;
  private colorId: string;

  public tableDOM: HTMLElement;
  public tabId: string;
  public extraImgId: string;
  public color: string;
}



namespace Private{
  /**
   * Convert snake_case to Sentence Case
   *
   * @param {string} word_in_snake - Word in snake_case
   */

  export function snakeToSentence(word_in_snake: string){
    return word_in_snake.split("_")
                          .map(word => word.charAt(0).toUpperCase()+word.slice(1))
                          .join(" ");
  }

  /**
   * Verify integrity of data
   */
  export function verifyDataIntegrity_ST(data: any){
    let integrity = 1;
    return integrity && data;
  }

  // /**
  //  * Create HTML template
  //  * @param {obj} obj - SummaryTable Instance
  //  */
  // export function createTemplate_ST(obj: SummaryTable){
  //   let template = "";
  //   template += '<div id="' + obj.tabId + '" class="table-grid"></div>';
  //   template += '<div id="' + obj.extraImgId + '">';
  //   template += '<div style="display:none"><h4>Confocal Image</h4><img class="clickable-image" alt="not available" tryCtr=0 maxTry=0></div>'; // change maxTry
  //   template += '<div style="display:none"><h4>Segmentation</h4><img class="clickable-image" alt="not available" tryCtr=0 maxTry=0></div>'; // change maxTry
  //   template += '<div style="display:none"><h4>Skeleton</h4><img class="clickable-image" alt="not available" tryCtr=0 maxTry=0></div>'; // change maxTry
  //   template += '</div>';
  //   return template;
  // }
}