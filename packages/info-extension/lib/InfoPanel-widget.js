"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const widgets_1 = require("@phosphor/widgets");
const coreutils_1 = require("@jupyterlab/coreutils");
const coreutils_2 = require("@phosphor/coreutils");
const signaling_1 = require("@phosphor/signaling");
const JSONEditor = require("jsoneditor");
require("../style/ffbo.InfoPanel.css");
const chart_js_1 = require("chart.js");
const DEFAULT_CLASS = "jp-FFBOLabMyInfo";
// FIXME: change publics to readonlys!!
/**
* InfoPanel
* @constuctor
* @param {string} div_id - id for div element in which the connectivity table is held
* @param {dict} [nameConfig={}] - configuration of children divs. The 3 children divs in ConnTable are `['connSVGId','connTableId','summaryTableId']`
*/
class InfoPanel {
    constructor(container, nameConfig) {
        Object.defineProperty(this, "connSVGId", {
            value: (nameConfig == null ? "info-panel-conn" : nameConfig.connSVGId),
            configurable: false,
            writable: false
        });
        /*
        Object.defineProperty(this, "connTableId", {
          value: nameConfig.connTableId || "info-panel-table",
          configurable: false,
          writable: false
        });
        */
        //console.log(this);
        Object.defineProperty(this, "summaryTableId", {
            value: (nameConfig == null ? "info-panel-table" : nameConfig.connTableId),
            configurable: false,
            writable: false
        });
        //console.log('summary table id');
        //console.log(this.summaryTableId);
        this.connSVG = undefined;
        //his.connTable = undefined;
        this.summaryTable = undefined;
        this.htmlTemplate = createTemplate_IP(this);
        this.dom = container;
        this.reset();
    }
    /**
     * Reset to detaul HTML
     */
    reset() {
        // purge div and add table
        //console.log(this.divId);
        //console.log(this.dom);
        this.dom.innerHTML = this.htmlTemplate;
        if (this.connSVG !== undefined) {
            delete this.connSVG;
        }
        /*
         if (this.connTable !== undefined) {
           delete this.connTable;
         }
         */
        if (this.summaryTable !== undefined) {
            delete this.summaryTable;
        }
        this.connSVG = new ConnSVG(this.dom.children.item(1), this);
        //this.connTable = new ConnTable(this.connTableId, this);
        //console.log("RESET-infopanel");
        //console.log(<HTMLElement>this.dom.children.item(0));
        this.summaryTable = new SummaryTable(this.dom.children.item(0), this); // neuron information table
    }
    /**
     * Check if an object is in the workspace.
     *
     * @param {string} rid -  rid of target object (neuron/synapse)
     * @returns {bool} if object in workspace
     */
    isInWorkspace(rid) {
        return false;
    }
    /**
     * Add an object into the workspace.
     *
     * @param {string} uname -  uname of target object (neuron/synapse)
     */
    addByUname(uname) {
        return;
    }
    /**
     * Remove an object into the workspace.
     *
     * @param {string} uname -  uname of target object (neuron/synapse)
     */
    removeByUname(uname) {
        return;
    }
    /**
     * Get attribute of an object in the workspace.
     *
     * @param {string} rid -  rid of target object
     * @returns {value} return Value as expected by the attribute
     */
    getAttr(rid, attr) {
        return undefined;
    }
    /**
    * Update Info Panel
    *
    * @param {obj} neuData - neuron Data
    * @param {obj} synData - synapse Data
    */
    update(data) {
        //console.log("UPDATE!");
        //console.log(data);
        //let classOfObj = data['summary']['class'];
        let new_name = ('uname' in data['summary']) ? data['summary']['uname'] : data['summary']['name'];
        if (this.name === new_name) {
            /** do not update if the object already exists, just show */
            this.show();
            this.resize();
            return;
        }
        else {
            this.name = new_name;
            if ('connectivity' in data) { // synapse data does not have connectivity
                this.connSVG.update(data['connectivity']);
                //this.connTable.update(data['connectivity']);
                this.summaryTable.update(data['summary']);
                this.show(); //show all
            }
            else {
                this.connSVG.hide();
                //this.connTable.hide();
                this.summaryTable.update(data['summary']);
                this.summaryTable.show();
            }
            this.resize();
        }
    }
    /**
     * show infopanel
     */
    show() {
        this.dom.style.display = "";
        //$('#' + this.divId).show();
        this.connSVG.show();
        //this.connTable.show();
        this.summaryTable.show();
    }
    /**
     * hide infopanel
     */
    hide() {
        this.connSVG.hide();
        //this.connTable.hide();
        this.summaryTable.hide();
        this.dom.style.display = "none";
        //$('#' + this.divId).hide();
    }
    /**
     * resize infopanel
     */
    resize() {
        this.connSVG.resize();
        //this.connTable.resize();
        this.summaryTable.resize();
    }
}
exports.InfoPanel = InfoPanel;
/**
 * Create HTML template
 *
 * @param {object} obj - synonymous to `this`, refers to instance of ConnTable
 */
function createTemplate_IP(obj) {
    var template = "";
    template += '<div id="' + obj.summaryTableId + '"></div>'; // summary
    // innerhtml += '<div id="info-panel-summary-extra"></div>';  // summary
    template += '<div id="' + obj.connSVGId + '"></div>'; // SVG
    //template += '<div id="' + obj.connTableId + '"></div>';
    template += '<div class="slider-bar ui-draggable ui-draggable-handle" draggable="true" id="info_panel_dragger"></div>';
    return template;
}
// SUMMARYTABLE.JS
/**
 * SummaryTable Information Constructor
 * @constructor
 * @param {string} container -  div in which to create SummaryTable
 * @param {obj} parentObj -  parentObject
 * @param {dict} [nameConfig={}] - configuration of children divs. The 3 children divs in ConnTable are `['colorId','extraImgId']`
 */
class SummaryTable {
    constructor(container, parentObj, nameConfig) {
        this.divId = container.id; // wrapper
        this.parentObj = parentObj;
        // nameConfig = nameConfig || {};
        Object.defineProperty(this, "colorId", {
            value: (nameConfig == null ? "info-panel-summary-neu-col" : nameConfig.colorId),
            configurable: false,
            writable: false
        });
        Object.defineProperty(this, "tabId", {
            value: (nameConfig == null ? "info-panel-summary-table" : nameConfig.tabId),
            configurable: false,
            writable: false
        });
        Object.defineProperty(this, "extraImgId", {
            value: (nameConfig == null ? "info-panel-extra-img" : nameConfig.extraImgId),
            configurable: false,
            writable: false
        });
        this.htmlTemplate = createTemplate_ST(this);
        this.dom = container;
        this.reset();
    }
    /*
      * Reset SummaryTable Table
      */
    reset() {
        // purge div and add table
        this.dom.innerHTML = this.htmlTemplate;
    }
    /**
     * SummaryTable Information show
     */
    show() {
        //$('#' + this.divId).show();
        this.dom.style.display = "";
    }
    /**
     * SummaryTable Information hide
     */
    hide() {
        //$('#' + this.divId).hide();
        this.dom.style.display = "none";
    }
    resize() {
        return;
    }
    /**
     * SummaryTable Information Update
     *
     */
    update(data) {
        if (verifyDataIntegrity_ST(data) == false) {
            return;
        }
        this.reset();
        //$('#' + this.divId).show(); // show summary information
        this.dom.style.display = "";
        // extra name and color
        let objName = ('uname' in data) ? data['uname'] : data['name'];
        if (data['class'] === 'Synapse') {
            //      objName = "Synapse between " + objName.split("--")[0]+ " and " + objName.split("--")[1];
            objName = objName.split("--")[0] + " to " + objName.split("--")[1];
        }
        let objRId = data['rid'];
        let objColor = this.parentObj.getAttr(objRId, 'color');
        let tableHtml = '<div> <p>Name :</p><p>' + objName;
        if (this.parentObj.isInWorkspace(objRId)) {
            tableHtml += '<button class="btn btn-remove btn-danger" id="btn-add-' + objName + '" name="' + objName + '" style="margin-left:20px;">-</button>';
        }
        else {
            tableHtml += '<button class="btn btn-add btn-success" id="btn-add-' + objName + '" name="' + objName + '" style="margin-left:20px;">+</button>';
        }
        tableHtml += '</p></div>';
        if (objColor) {
            // add choose color
            tableHtml += '<div><p>Choose Color:</p><p> <input class="color_inp"';
            // if (Modernizr.inputtypes.color) {
            //   tableHtml += 'type="color"';
            // }
            // else {
            //   tableHtml += 'type="text"';
            // }
            tableHtml += 'name="neu_col" id="' + this.colorId + '" value="#' + objColor + '"/></p></div>';
        }
        else {
            //do nothing;
        }
        let displayKeys = ['class', 'vfb_id', 'data_source', 'transgenic_lines', 'transmitters', 'expresses'];
        //let displayCtr = 0;
        //let keyCounter = 0;
        for (let key of displayKeys) {
            if (!(key in data) || data[key] == 0) {
                continue;
            }
            let fieldName = snakeToSentence(key);
            let fieldValue = data[key];
            if (key === 'vfb_id') {
                let vfbBtn = "<a target='_blank' href='http://virtualflybrain.org/reports/" + data[key] + "'>VFB link</a>";
                fieldName = 'External Link';
                fieldValue = vfbBtn;
            }
            tableHtml += "<div><p>" + fieldName + ":</p><p>" + fieldValue + "</p></div>";
        }
        this.dom.querySelector('#' + this.tabId).innerHTML = tableHtml;
        //$('#' + this.tabId).html(tableHtml);
        // // set callback <TODO> check this
        // if (!Modernizr.inputtypes.color) {
        //   $('#' + this.colorId).spectrum({
        //     showInput: true,
        //     showPalette: true,
        //     showSelectionPalette: true,
        //     showInitial: true,
        //     localStorageKey: "spectrum.neuronlp",
        //     showButtons: false,
        //     move: (c) => {
        //       this.parentObj.setAttr(objRId, 'color', c.toHexString());
        //     }
        //   });
        // }
        // else {
        //   $('#' + this.colorId).on('change', (c) => {
        //     this.parentObj.setAttr(objRId, 'color', $('#' + this.colorId)[0].value);
        //   });
        // }
        // flycircuit data
        if (('data_source' in data) && (data['data_source'].indexOf("FlyCircuit") > -1)) { // see if flycircuit is in
            let extraTableHtml = "";
            let extraData = data['flycircuit_data'];
            let extraKeys = ["Lineage", "Author", "Driver", "Gender/Age", "Soma Coordinate", "Putative birth time", "Stock"];
            if (!('error' in extraData)) {
                // Fetch Key:value pair for flycircuit_data and add to
                for (let key of extraKeys) {
                    if (!(key in extraData) || extraData[key] == 0) {
                        continue;
                    }
                    extraTableHtml += "<div><p>" + key + ":</p><p>" + extraData[key] + "</p></div>";
                }
                this.dom.querySelector('#' + this.tabId).innerHTML = this.dom.querySelector('#' + this.tabId).innerHTML + extraTableHtml;
                //$('#' + this.tabId).append(extraTableHtml);
                // set source for images
                if ("Images" in extraData) {
                    let imgList = ["Original confocal image (Animation)", "Segmentation", "Skeleton (download)"];
                    let current_obj = this;
                    imgList.forEach(function (imgName, idx) {
                        //$('#' + this.extraImgId + " img")[idx].onerror = function () {
                        //console.log("AT ERROR!");
                        //console.log(current_obj);
                        //console.log(current_obj.dom);
                        //console.log(current_obj.dom.querySelectorAll('#' + this.extraImgId + " img"));
                        //console.log(idx);
                        //console.log(this);
                        current_obj.dom.querySelectorAll('#' + current_obj.extraImgId + " img")[idx].onerror = function () {
                            this.parentElement.style.display = "none";
                            if (Number(this.getAttribute("tryCtr")) < Number(this.getAttribute("maxTry"))) { // try 5 times max
                                let currTry = Number(this.getAttribute("tryCtr"));
                                setTimeout(() => {
                                    this.src = extraData["Images"][imgName];
                                }, 1000);
                                //console.log("[InfoPanel.SummaryTable > Retry] Image: "+ imgName);
                                this.setAttribute("tryCtr", String(currTry += 1));
                                return;
                            }
                            else {
                                //console.log("[InfoPanel.SummaryTable > Failed] Image "+ imgName);
                                this.setAttribute("tryCtr", "0");
                                return;
                            }
                        };
                        //$('#' + this.extraImgId + " img")[idx].onload = function () {
                        current_obj.dom.querySelectorAll('#' + current_obj.extraImgId + " img")[idx].onload = function () {
                            this.setAttribute("tryCtr", "0");
                            //console.log("[InfoPanel.SummaryTable > Success] Image "+ imgName);
                            this.parentElement.style.display = "block";
                        };
                        if (extraData["Images"][imgName]) {
                            let _source = extraData["Images"][imgName];
                            //(<HTMLImageElement>$('#' + this.extraImgId + " img")[idx]).src = <string>_source;
                            //(<HTMLImageElement>current_obj.dom.querySelectorAll('#' + current_obj.extraImgId + " img")[idx]).src = "http://bionet.000webhostapp.com"+<string>_source;
                            current_obj.dom.querySelectorAll('#' + current_obj.extraImgId + " img")[idx].src = "https://neuronlp.fruitflybrain.org" + _source;
                        }
                        else {
                            //$('#' + this.extraImgId + " img")[idx].style.display = "none";
                            current_obj.dom.querySelectorAll('#' + current_obj.extraImgId + " img")[idx].style.display = "none";
                        }
                    });
                    //$("#" + this.extraImgId).show();
                    this.dom.querySelector('#' + current_obj.extraImgId).style.display = "";
                }
            }
        }
        this.setupCallbacks();
    }
    /**
     * Setup Callback for add remove button
     */
    setupCallbacks() {
        let that = this;
        //$("#" + that.divId + " button").click(function () {
        // FIXME: redo this better
        this.dom.querySelector("#" + that.divId + " button").setAttribute("onClick", "if (this.className.search('add') != -1) {that.parentObj.addByUname((<HTMLImageElement>this).name);}else {that.parentObj.removeByUname((<HTMLImageElement>this).name);}");
    }
}
exports.SummaryTable = SummaryTable;
/**
 * Convert snake_case to Sentence Case
 *
 * @param {string} word_in_snake - Word in snake_case
 */
function snakeToSentence(word_in_snake) {
    return word_in_snake.split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
/**
 * Verify integrity of data
 */
function verifyDataIntegrity_ST(data) {
    let integrity = 1;
    return integrity && data;
}
/**
 * Create HTML template
 * @param {obj} obj - SummaryTable Instance
 */
function createTemplate_ST(obj) {
    let template = "";
    template += '<div id="' + obj.tabId + '" class="table-grid"></div>';
    template += '<div id="' + obj.extraImgId + '">';
    template += '<div style="display:none"><h4>Confocal Image</h4><img class="clickable-image" alt="not available" tryCtr=0 maxTry=0></div>'; // change maxTry
    template += '<div style="display:none"><h4>Segmentation</h4><img class="clickable-image" alt="not available" tryCtr=0 maxTry=0></div>'; // change maxTry
    template += '<div style="display:none"><h4>Skeleton</h4><img class="clickable-image" alt="not available" tryCtr=0 maxTry=0></div>'; // change maxTry
    template += '</div>';
    return template;
}
// CONNSVG.JS
/**
 * Connectivity SVG inside Info Panel
 * @constructor
 * @param {string} div_id - id for div element in which the connectivity table is held
 * @param {obj} parentObj - parent object (infopanel)
 * @param {dict} [nameConfig={}] - configuration of children divs. The 3 children divs in ConnTable are `['tabId','tabTextId','svgId']`.
 *    `tabId`: holder for table showing information over each rectangle in svg on hover/click,
 *    `tabTextId`: the `<td>` element in tabId div where the text is being held
 *    `svgId`: div for where the svg will be rendered
 */
class ConnSVG {
    constructor(div_id, parentObj, nameConfig) {
        //this.divId = div_id.id; // wrapper
        //this.parentObj = parentObj;
        Object.defineProperty(this, "tabId", {
            value: (nameConfig == null ? "info-panel-conn-table" : nameConfig.tabId),
            configurable: false,
            writable: false
        });
        Object.defineProperty(this, "tabTextId", {
            value: (nameConfig == null ? "info-panel-conn-table-text" : nameConfig.tabTextId),
            configurable: false,
            writable: false
        });
        Object.defineProperty(this, "ctxId_pre", {
            value: (nameConfig == null ? "info-panel-conn-ctx_pre" : nameConfig.ctxId_pre),
            configurable: false,
            writable: false
        });
        Object.defineProperty(this, "ctxId_post", {
            value: (nameConfig == null ? "info-panel-conn-ctx_post" : nameConfig.ctxId_post),
            configurable: false,
            writable: false
        });
        this.ctx_pre = undefined; // initialize ctx object to undefined
        this.ctx_post = undefined; // initialize ctx object to undefined
        this.htmlTemplate = createTemplate_CSVG(this);
        this.dom = div_id;
        this.reset();
    }
    /**
     * Reset SVG plot to default state, remove this.svg object
     */
    reset() {
        // purge div and add table
        // FIXME: dispose() of pre and post chartjs
        if (this.ctx_pre) {
            delete this.ctx_pre;
            this.ctx_pre = undefined;
        }
        if (this.ctx_post) {
            delete this.ctx_post;
            this.ctx_post = undefined;
        }
        this.dom.innerHTML = this.htmlTemplate;
    }
    /**
     * Hide SVG table and plot
     */
    hide() {
        this.dom.style.display = "none";
        /*
        //$('#' + this.tabId).hide();
        (<HTMLElement>this.dom.querySelector('#' + this.tabId)).style.display = "none";
        //$('#' + this.ctxId).hide();
        (<HTMLElement>this.dom.querySelector('#' + this.ctxId_pre)).style.display = "none";
        (<HTMLElement>this.dom.querySelector('#' + this.ctxId_post)).style.display = "none";
        //$('#' + this.tabTextId).hide();
        (<HTMLElement>this.dom.querySelector('#' + this.tabTextId)).style.display = "none";
        */
    }
    /**
     * Show SVG table and plot
     */
    show() {
        this.dom.style.display = "";
        /*
        //$('#' + this.tabId).show();
        if((<HTMLElement>this.dom.querySelector('#' + this.tabId)) != null)
        {
          (<HTMLElement>this.dom.querySelector('#' + this.tabId)).style.display = "";
        }
        //$('#' + this.ctxId).show();
        if((<HTMLElement>this.dom.querySelector('#' + this.ctxId_pre)) != null)
        {
          (<HTMLElement>this.dom.querySelector('#' + this.ctxId_pre)).style.display = "inline-block";
        }
        if((<HTMLElement>this.dom.querySelector('#' + this.ctxId_post)) != null)
        {
          (<HTMLElement>this.dom.querySelector('#' + this.ctxId_post)).style.display = "inline-block";
        }
        if((<HTMLElement>this.dom.querySelector('#' + this.tabTextId)) != null)
        {
          (<HTMLElement>this.dom.querySelector('#' + this.tabTextId)).style.display = "";
        }
        //$('#' + this.tabTextId).show();
        */
    }
    /**
     * Update SVG
     */
    update(data) {
        if (verifyDataIntegrity_CSVG(data) == false) {
            return;
        }
        this.reset();
        this.dom.querySelector('#' + this.ctxId_pre).style.minWidth = "45%";
        this.dom.querySelector('#' + this.ctxId_post).style.minWidth = "45%";
        this.dom.querySelector('#' + this.ctxId_pre).style.display = "inline-block";
        this.dom.querySelector('#' + this.ctxId_post).style.display = "inline-block";
        this.dom.querySelector('#' + this.ctxId_pre).style.position = "relative";
        this.dom.querySelector('#' + this.ctxId_post).style.position = "relative";
        this.ctx_pre = (this.dom.querySelector('#' + this.ctxId_pre)).appendChild(document.createElement('canvas'));
        this.ctx_post = (this.dom.querySelector('#' + this.ctxId_post)).appendChild(document.createElement('canvas'));
        //this.ctx_pre.style.width = "50%";
        //this.ctx_pre.style.height = "50%";
        //this.ctx_post.style.width = "50%";
        //this.ctx_post.style.height = "50%";
        // extract data
        var pre_sum = data['pre']['summary']['profile']; // presynaptic summary (in percentage)
        var post_sum = data['post']['summary']['profile']; // postsynaptic summary (in percentage)
        var pre_num = data['pre']['summary']['number']; // presynaptic number (total number)
        var post_num = data['post']['summary']['number']; // postsynaptic number (total number)
        // TODO: Give min-width/height and overflow
        // TODO: separate legend [chart.generateLegend()]
        // TODO: color generation
        // TODO: CSS-grid?
        // TODO: responsive center synapse text size
        // FIXME: look at memory/leaks and disposal/destruction
        // FIXME: Chart JS on small screen
        // FIXME: JSONEditor content
        var pre = [];
        var data_pre = [];
        var labels_pre = [];
        let count = 0;
        for (var key in pre_sum) {
            if (pre_sum.hasOwnProperty(key)) {
                pre[count] = {
                    data: pre_sum[key].toFixed(2),
                    label: key + " (" + pre_sum[key].toFixed(2) + "%)"
                };
            }
            count++;
        }
        pre = pre.sort(function (a, b) { return +a.data > +b.data ? -1 : 1; });
        pre.forEach(function (elem) {
            data_pre.push(elem['data']);
            labels_pre.push(elem['label']);
        });
        var post = [];
        var data_post = [];
        var labels_post = [];
        count = 0;
        for (var key in post_sum) {
            if (post_sum.hasOwnProperty(key)) {
                post[count] = {
                    data: post_sum[key].toFixed(2),
                    label: key + " (" + post_sum[key].toFixed(2) + "%)"
                };
            }
            count++;
        }
        post = post.sort(function (a, b) { return +a.data > +b.data ? -1 : 1; });
        post.forEach(function (elem) {
            data_post.push(elem['data']);
            labels_post.push(elem['label']);
        });
        var pre_plugin = {
            beforeDraw: function (chart) {
                var width = chart.chart.width, height = chart.chart.height, ctx = chart.chart.ctx, type = chart.config.type;
                if (type == 'doughnut') {
                    var oldFill = ctx.fillStyle;
                    var fontSize = ((height - chart.chartArea.top) / 250).toFixed(2);
                    ctx.restore();
                    ctx.font = fontSize + "em Rajdhani, sans-serif";
                    ctx.textBaseline = "middle";
                    var text = pre_num + " synapses", textX = Math.round((width - ctx.measureText(text).width + chart.chartArea.left) / 2), textY = (height + chart.chartArea.top) / 2;
                    ctx.fillStyle = '#000000';
                    ctx.fillText(text, textX, textY);
                    ctx.fillStyle = oldFill;
                    ctx.save();
                }
            },
            legendCallback: function (chart) {
                var text = [];
                text.push('<ul class="' + chart.id + '-legend">');
                for (var i = 0; i < chart.data.datasets.length; i++) {
                    text.push('<li><span style="background-color:' +
                        chart.data.datasets[i].backgroundColor +
                        '"></span>');
                    if (chart.data.datasets[i].label) {
                        text.push(chart.data.datasets[i].label);
                    }
                    text.push('</li>');
                }
                text.push('</ul>');
                return text.join('');
            }
        };
        var post_plugin = {
            beforeDraw: function (chart) {
                var width = chart.chart.width, height = chart.chart.height, ctx = chart.chart.ctx, type = chart.config.type;
                if (type == 'doughnut') {
                    var oldFill = ctx.fillStyle;
                    var fontSize = ((height - chart.chartArea.top) / 250).toFixed(2);
                    ctx.restore();
                    ctx.font = fontSize + "em Rajdhani, sans-serif";
                    ctx.textBaseline = "middle";
                    var text = post_num + " synapses", textX = Math.round((width - ctx.measureText(text).width + chart.chartArea.left) / 2), textY = (height + chart.chartArea.top) / 2;
                    ctx.fillStyle = '#000000';
                    ctx.fillText(text, textX, textY);
                    ctx.fillStyle = oldFill;
                    ctx.save();
                }
            }
        };
        new chart_js_1.Chart(this.ctx_pre, {
            type: 'doughnut',
            data: {
                datasets: [{
                        data: data_pre,
                        backgroundColor: [
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                        ]
                    }],
                labels: labels_pre
            },
            options: {
                responsive: true,
                cutoutPercentage: 50,
                title: {
                    display: true,
                    text: 'Presynaptic'
                },
                legend: {
                    display: false,
                    position: 'left',
                    labels: {
                        filter: (legendItem, chartData) => {
                            return legendItem.index < 5;
                        },
                        fontFamily: "Rajdhani, sans-serif"
                    }
                }
            },
            plugins: [pre_plugin]
        });
        new chart_js_1.Chart(this.ctx_post, {
            type: 'doughnut',
            data: {
                datasets: [{
                        data: data_post,
                        backgroundColor: [
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                            '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd',
                        ]
                    }],
                labels: labels_post
            },
            options: {
                responsive: true,
                cutoutPercentage: 50,
                title: {
                    display: true,
                    text: 'Postsynaptic'
                },
                legend: {
                    display: false,
                    position: 'left',
                    labels: {
                        filter: (legendItem, chartData) => {
                            return legendItem.index < 5;
                        },
                        fontFamily: "Rajdhani, sans-serif"
                    }
                }
            },
            plugins: [post_plugin]
        });
        //updateConfigByMutating(chartjs_pre);
        //updateConfigByMutating(chartjs_post);
    }
    /**
     * Resize Synaptic Profile plot
     */
    resize() {
        //     if(this.svg){ //check if an svg file exists, if not getBBox will throw
        //       let svgBbox = this.svg.dom.getBBox();
        //       let width_margin = 40;
        //       let divBbox = $('#'+this.svgId)[0].getBoundingClientRect();
        // //      this.svg.dom.setAttribute("width", width_tot);
        //       this.svg.dom.setAttribute("viewBox", (svgBbox.x-width_margin/2)+" "+(svgBbox.y)+" "+(divBbox.width+width_margin)+" "+(divBbox.height));
        //     }else{
        //       return;
        //     }
        return;
    }
}
exports.ConnSVG = ConnSVG;
/**
 * Create HTML template. It is not an object method because it should be hidden
 * @param {obj} obj - this ConnSVG object
 */
function createTemplate_CSVG(obj) {
    var template = "";
    template = "";
    template += '<div id="' + obj.ctxId_pre + '"></div>';
    template += '<div id="' + obj.ctxId_post + '"></div>';
    return template;
}
/**
 * Verify that data used for updating plot is valid
 * @param {obj} data - data for SVG plot
 */
function verifyDataIntegrity_CSVG(data) {
    let integrity = 1;
    return integrity && data && ('pre' in data) && ('post' in data);
}
/*
chart js update function test

function updateConfigByMutating(chart: any) {
  chart.options.legend.display = false;
  chart.update();
}
*/
/**
 * A NeuroInfo Widget
 *
 * @param {FFBOLabModel} model
 * @param {string} [className]
 */
class InfoPanelWidget extends widgets_1.Widget {
    /**
     * Construct a new FFBO widget.
     */
    constructor(className) {
        super();
        /**
         * The Elements associated with the widget.
         */
        this._ready = new coreutils_2.PromiseDelegate();
        this._valueChanged = new signaling_1.Signal(this);
        if (className) {
            this.addClass(className);
        }
        else {
            this.addClass(DEFAULT_CLASS);
        }
        this.id = 'FFBOLab-MyInfo-' + coreutils_1.uuid();
        this.editor = new InfoPanel(this.node);
        var current_obj = this;
        this.jsoneditor = new JSONEditor(this.node, {
            onChange: function () {
                current_obj._valueChanged.emit(current_obj.jsoneditor.getText());
            },
            mode: 'form'
        });
        this._initialize();
    }
    get valueChanged() {
        return this._valueChanged;
    }
    /**
     * Instantiate Child Widgets on Master Widget's `context.ready`
     */
    _initialize() {
        this._ready.resolve(void 0);
    }
    /**
     * Dispose the current
     */
    /* FIXME implement this
    dispose(): void {
      if (this._isDisposed == true) {
        return;
      }
  
      this.editor.destroy();
      this.editor.destroy();
      super.dispose();
      this._isDisposed = true;
      if (this._isDisposed) {
        console.log('[FFBOLab Info] disposed');
      }
    }
    */
    /**
     * A promise that resolves when the FFBOLab widget is ready
     */
    get ready() {
        return this._ready.promise;
    }
    /**
     * Handle update requests for the widget.
     */
    onUpdateRequest(msg) {
        console.log(msg);
    }
}
exports.InfoPanelWidget = InfoPanelWidget;
;
//# sourceMappingURL=InfoPanel-widget.js.map