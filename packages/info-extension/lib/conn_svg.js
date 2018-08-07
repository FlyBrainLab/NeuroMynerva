"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chart_js_1 = require("chart.js");
const widgets_1 = require("@phosphor/widgets");
const TABLE_ID = "info-panel-conn-table";
const TABLE_TEXT_ID = "info-panel-conn-table-text";
const CTX_PRE_ID = "info-panel-conn-ctx_pre";
const CTX_POST_ID = "info-panel-conn-ctx_post";
/**
* Connectivity SVG inside Info Panel
*/
class ConnSVG extends widgets_1.Widget {
    constructor() {
        super();
        this.tabId = TABLE_ID;
        this.tabTextId = TABLE_TEXT_ID;
        this.ctxId_pre = CTX_PRE_ID;
        this.ctxId_post = CTX_POST_ID;
        this.ctx_pre = undefined; // initialize ctx object to undefined
        this.ctx_post = undefined; // initialize ctx object to undefined
        this.container = this.node.parentElement;
        this.reset();
    }
    /**
    * Reset SVG plot to default state, remove this.svg object
    */
    reset() {
        // purge div and add table
        // FIXME: dispose() of pre and post chartjs
        let _div = document.getElementById(CTX_PRE_ID);
        if (_div) {
            _div.remove();
        }
        ;
        _div = document.getElementById(CTX_POST_ID);
        if (_div) {
            _div.remove();
        }
        ;
        let preDiv = document.createElement('div');
        preDiv.id = this.ctxId_pre;
        this.node.appendChild(preDiv);
        let postDiv = document.createElement('div');
        postDiv.id = this.ctxId_post;
        this.node.appendChild(postDiv);
        preDiv.style.minWidth = "45%";
        postDiv.style.minWidth = "45%";
        preDiv.style.display = "inline-block";
        postDiv.style.display = "inline-block";
        preDiv.style.position = "relative";
        postDiv.style.position = "relative";
        this.ctx_pre = preDiv.appendChild(document.createElement('canvas'));
        this.ctx_post = postDiv.appendChild(document.createElement('canvas'));
    }
    /**
    * Update SVG
    */
    updateData(data) {
        if (verifyDataIntegrity_CSVG(data) == false) {
            return;
        }
        this.reset();
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
}
exports.ConnSVG = ConnSVG;
// /**
// * Create HTML template. It is not an object method because it should be hidden
// * @param {obj} obj - this ConnSVG object
// */
// function createTemplate_CSVG(obj: ConnSVG){
//   var template = "";
//   template = "";
//   template += '<div id="' + obj.ctxId_pre + '"></div>';
//   template += '<div id="' + obj.ctxId_post + '"></div>';
//   return template;
// }
/**
* Verify that data used for updating plot is valid
* @param {obj} data - data for SVG plot
*/
function verifyDataIntegrity_CSVG(data) {
    let integrity = 1;
    return integrity && data && ('pre' in data) && ('post' in data);
}
//# sourceMappingURL=conn_svg.js.map